"""Actual staged Flask controller logic, mocked HTTP/ROS transport, mock Arduino bytes.

No network connections, ROS daemon, serial devices, or motor motion.
"""
import importlib
import sys
import types
from collections import defaultdict
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'controller/source'))
sys.path.insert(0, str(ROOT / 'forwarders'))
from byte_serial import SerialByteWriter, BLDC_ALLOWED, BASE_ALLOWED


class Vector:
    def __init__(self):
        self.x = 0.0
        self.y = 0.0
        self.z = 0.0


class Twist:
    def __init__(self):
        self.linear = Vector()
        self.angular = Vector()


class Number:
    def __init__(self):
        self.data = 0


class Port:
    def __init__(self):
        self.is_open = True
        self.received = []

    def write(self, value):
        self.received.append(bytes(value))
        return len(value)


class Publisher:
    def __init__(self, topic, subscribers):
        self.topic = topic
        self.messages = []
        self.subscribers = subscribers

    def publish(self, message):
        self.messages.append(message)
        for listener in self.subscribers[self.topic]:
            listener(message)


class FakeNode:
    def __init__(self, subscriptions):
        self.subscriptions = subscriptions
        self.publishers = {}
        self.errors = []

    def create_publisher(self, kind, topic, queue_size):
        publisher = Publisher(topic, self.subscriptions)
        self.publishers[topic] = publisher
        return publisher

    def get_logger(self):
        return types.SimpleNamespace(error=lambda msg: self.errors.append(str(msg)))


class FakeApp:
    def __init__(self):
        self.routes = {}
        self.arm_coordinator = None

    def route(self, path, methods):
        def decorator(func):
            for method in methods:
                self.routes[(method, path)] = func
            return func
        return decorator

    def call(self, method, path):
        result = self.routes[(method, path)]()
        if isinstance(result, tuple):
            return result
        return result, 200


@pytest.fixture
def harness(monkeypatch):
    bus = defaultdict(list)
    node = FakeNode(bus)
    apps = []
    payload = {'body': None}

    flask = types.ModuleType('flask')
    flask.Flask = lambda name: apps.append(FakeApp()) or apps[-1]
    flask.request = types.SimpleNamespace(get_json=lambda **kw: payload['body'])

    geom = types.ModuleType('geometry_msgs')
    geom_msg = types.ModuleType('geometry_msgs.msg')
    geom_msg.Twist = Twist
    geom.msg = geom_msg

    std = types.ModuleType('std_msgs')
    std_msg = types.ModuleType('std_msgs.msg')
    std_msg.Float64 = Number
    std_msg.Int8 = Number
    std_msg.UInt8 = Number
    std.msg = std_msg

    ros = types.ModuleType('rclpy')
    ros.init = lambda args=None: None
    ros.create_node = lambda name: node

    for name, module in {
        'flask': flask, 'rclpy': ros, 'geometry_msgs': geom,
        'geometry_msgs.msg': geom_msg, 'std_msgs': std,
        'std_msgs.msg': std_msg,
    }.items():
        monkeypatch.setitem(sys.modules, name, module)

    # Force the source module to use the fake ROS and Flask implementations.
    for name in list(sys.modules):
        if name == 'ezrassor_controller_server' or name.startswith('ezrassor_controller_server.'):
            monkeypatch.delitem(sys.modules, name, raising=False)

    module = importlib.import_module('ezrassor_controller_server.__main__')
    bldc = Port()
    base = Port()
    wheel = []
    bl_writer = SerialByteWriter(bldc, BLDC_ALLOWED)
    base_writer = SerialByteWriter(base, BASE_ALLOWED)
    prefix = '/ip_192_168_10_3/'
    bus[prefix + 'bldc_command_byte'].append(lambda m: bl_writer.write(m.data))
    bus[prefix + 'arm_base_command_byte'].append(lambda m: base_writer.write(m.data))
    bus[prefix + 'wheel_instructions'].append(lambda m: wheel.append((m.linear.x, m.angular.z)))

    app = module.create_app(node, enable_arm=True, namespace='ip_192_168_10_3',
                            coordinator_options={'min_move_ms': 0})

    def call(method, path, body=None):
        payload['body'] = body
        return app.call(method, path)

    yield types.SimpleNamespace(call=call, app=app, node=node, bldc=bldc, base=base,
                                wheel=wheel, bus=bus, module=module)
    if app.arm_coordinator:
        app.arm_coordinator.close()
    for name in list(sys.modules):
        if name == 'ezrassor_controller_server' or name.startswith('ezrassor_controller_server.'):
            sys.modules.pop(name, None)


def test_ros_topics_match_pi_forwarder_prefix(harness):
    topics = harness.node.publishers
    assert '/ip_192_168_10_3/wheel_instructions' in topics
    assert '/ip_192_168_10_3/arm_base_command_byte' in topics
    assert '/ip_192_168_10_3/bldc_command_byte' in topics


def test_root_get_matches_observed_health_endpoint(harness):
    assert harness.call('GET', '/') == ({'Status': 200}, 200)


@pytest.mark.parametrize('field,direction,byte', [
    ('plate_joint_action', 'POSITIVE', 0x0C),
    ('plate_joint_action', 'NEGATIVE', 0x0D),
    ('plate_joint_action', 'STOP', 0x0E),
    ('shoulder_joint_action', 'POSITIVE', 0x0F),
    ('shoulder_joint_action', 'NEGATIVE', 0x10),
    ('shoulder_joint_action', 'STOP', 0x11),
    ('forearm_joint_action', 'POSITIVE', 0x12),
    ('forearm_joint_action', 'NEGATIVE', 0x13),
    ('forearm_joint_action', 'STOP', 0x14),
    ('end_effector_action', 'POSITIVE', 0x09),
    ('end_effector_action', 'NEGATIVE', 0x0A),
    ('end_effector_action', 'STOP', 0x0B),
])
def test_actual_flask_handler_to_ros_topic_to_mock_serial(harness, field, direction, byte):
    result, code = harness.call('POST', '/', {field: direction})
    assert code == 200 and result['published'] is True
    assert result['hardware_acknowledged'] is False
    if field == 'plate_joint_action':
        assert harness.base.received == [bytes((byte,))]
        assert harness.bldc.received == []
    else:
        assert harness.bldc.received == [bytes((byte,))]
        assert harness.base.received == []
    assert not harness.wheel


def test_arm_all_stop_reaches_two_serial_controllers(harness):
    result, code = harness.call('POST', '/', {'arm_all_stop': True})
    assert code == 200
    assert harness.bldc.received == [b'\x18']
    assert harness.base.received == [b'\x0e']
    assert not harness.wheel


def test_four_joint_stop_legacy_ui_shape(harness):
    body = {name: 'STOP' for name in (
        'plate_joint_action', 'shoulder_joint_action', 'forearm_joint_action', 'end_effector_action')}
    result, code = harness.call('POST', '/', body)
    assert code == 200
    assert harness.bldc.received == [b'\x18']
    assert harness.base.received == [b'\x0e']


def test_estop_publishes_to_bldc_base_and_wheels(harness):
    result, code = harness.call('POST', '/arm/estop')
    assert code == 200 and result['latched']
    assert harness.bldc.received == [b'\x18']
    assert harness.base.received == [b'\x0e']
    assert harness.wheel == [(0.0, 0.0)]
    result, code = harness.call('POST', '/', {'plate_joint_action': 'POSITIVE'})
    assert code == 423
    assert harness.base.received == [b'\x0e']


def test_legacy_wheel_command_preserved(harness):
    response, status = harness.call('POST', '/', {'wheel_action': {'linear_x': '1', 'angular_z': 0}})
    assert (response, status) == ({'status': 200}, 200)
    assert harness.wheel == [(1.0, 0.0)]
    assert harness.bldc.received == [] and harness.base.received == []


def test_legacy_arm_and_drum_not_confused_with_new_arm(harness):
    reply, code = harness.call('POST', '/', {'front_arm_action': 'RAISE', 'front_drum_action': 'DIG'})
    assert code == 200
    assert len(harness.node.publishers['/ip_192_168_10_3/front_arm_instructions'].messages) == 1
    assert not harness.bldc.received and not harness.base.received


@pytest.mark.parametrize('payload', [
    None, [], {}, 'hello', {'unknown_command': 'POSITIVE'},
    {'plate_joint_action': 1}, {'arm_all_stop': False},
    {'wheel_action': {'linear_x': 'nan', 'angular_z': 1}},
    {'wheel_action': {'linear_x': 'bad', 'angular_z': 0}},
    {'wheel_action': {'linear_x': True, 'angular_z': 0}},
    {'wheel_action': {'linear_x': 0}},
    {'plate_joint_action': 'POSITIVE', 'shoulder_joint_action': 'POSITIVE'},
])
def test_invalid_requests_do_not_publish_any_bytes(harness, payload):
    reply, code = harness.call('POST', '/', payload)
    assert code == 400
    assert harness.base.received == []
    assert harness.bldc.received == []
    assert harness.wheel == []


def test_arm_not_enabled_without_explicit_flag(harness):
    disabled = harness.module.create_app(harness.node, enable_arm=False,
                                         namespace='ip_192_168_10_3')
    # Invoke the real decorated handler with an arm payload.
    import flask
    orig = flask.request.get_json
    flask.request.get_json = lambda **kwargs: {'shoulder_joint_action': 'POSITIVE'}
    try:
        result, code = disabled.call('POST', '/')
    finally:
        flask.request.get_json = orig
    assert code == 503
    assert harness.bldc.received == [] and harness.base.received == []


def test_estop_blocks_legacy_rover_motion_too(harness):
    harness.call('POST', '/arm/estop')
    reply, code = harness.call('POST', '/', {'wheel_action': {'linear_x': 1, 'angular_z': 0}})
    assert code == 423
    assert harness.wheel == [(0.0, 0.0)]
