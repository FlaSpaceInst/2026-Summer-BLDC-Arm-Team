"""Exercise the real staged wheel forwarder's new base callback with fake serial."""

import importlib.util
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'forwarders'))
SOURCE = ROOT / 'forwarders/staged_wheel_base_forwarder.py'


class FakeSerial:
    def __init__(self):
        self.baudrate = None
        self.port = None
        self.write_timeout = None
        self.is_open = False
        self.writes = []

    def open(self):
        self.is_open = True

    def write(self, payload):
        self.writes.append(bytes(payload))
        return len(payload)

    def flushInput(self):
        pass

    def flushOutput(self):
        pass

    def close(self):
        self.is_open = False


class Msg:
    def __init__(self, data=0):
        self.data = data


class Twist:
    def __init__(self, x=0.0, z=0.0):
        self.linear = types.SimpleNamespace(x=x, y=0.0)
        self.angular = types.SimpleNamespace(z=z, y=0.0)


class FakeNode:
    def __init__(self, name):
        self.subscriptions = {}
        self.published = {}
        self.errors = []
        self.infos = []

    def create_publisher(self, kind, topic, qos):
        messages = []
        self.published[topic] = messages
        return types.SimpleNamespace(publish=lambda msg: messages.append(msg.data))

    def create_subscription(self, kind, topic, callback, qos):
        self.subscriptions[topic] = callback
        return callback

    def get_logger(self):
        return types.SimpleNamespace(
            info=lambda msg: self.infos.append(msg),
            error=lambda msg: self.errors.append(msg),
        )


@pytest.fixture
def forwarder(monkeypatch):
    serial = types.ModuleType('serial')
    serial.Serial = FakeSerial
    serial.SerialTimeoutException = TimeoutError
    rclpy = types.ModuleType('rclpy')
    rclpy.init = lambda args=None: None
    rclpy.spin = lambda node: None
    rclpy.shutdown = lambda: None
    node = types.ModuleType('rclpy.node')
    node.Node = FakeNode
    std = types.ModuleType('std_msgs')
    std_msg = types.ModuleType('std_msgs.msg')
    std_msg.String = Msg
    std_msg.UInt8 = Msg
    std.msg = std_msg
    geom = types.ModuleType('geometry_msgs')
    geom_msg = types.ModuleType('geometry_msgs.msg')
    geom_msg.Twist = Twist
    geom.msg = geom_msg
    for key, module in {
        'serial': serial, 'rclpy': rclpy, 'rclpy.node': node,
        'std_msgs': std, 'std_msgs.msg': std_msg,
        'geometry_msgs': geom, 'geometry_msgs.msg': geom_msg,
    }.items():
        monkeypatch.setitem(sys.modules, key, module)
    spec = importlib.util.spec_from_file_location('staged_forwarder_test', SOURCE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module.RassorDriverSubscriber, 'get_ip_address',
                        lambda self: 'ip_192_168_10_3')
    original_exists = module.os.path.exists
    monkeypatch.setattr(module.os.path, 'exists',
                        lambda p: p == '/dev/arduino_wheel' or (p != '/dev/arduino_drum' and original_exists(p)))
    return module.RassorDriverSubscriber()


def test_staged_base_uses_same_wheel_serial_owner(forwarder):
    wheel = forwarder.__class__.usb1
    assert wheel.is_open
    assert '/ip_192_168_10_3/wheel_instructions' in forwarder.subscriptions
    assert '/ip_192_168_10_3/arm_base_command_byte' in forwarder.subscriptions
    forwarder.subscriptions['/ip_192_168_10_3/wheel_instructions'](Twist(x=0.0, z=0.0))
    forwarder.subscriptions['/ip_192_168_10_3/arm_base_command_byte'](Msg(0x0C))
    forwarder.subscriptions['/ip_192_168_10_3/arm_base_command_byte'](Msg(0x0E))
    assert wheel.writes == [b'\x00', b'\x0c', b'\x0e']


@pytest.mark.parametrize('disallowed', [0x00, 0x01, 0x09, 0x0F, 0x18, 256, -1])
def test_base_forwarder_cannot_send_wheel_or_bldc_command_bytes(forwarder, disallowed):
    port = forwarder.__class__.usb1
    forwarder.listener_callback_base(Msg(disallowed))
    assert not port.writes
    assert forwarder.errors


def test_wheel_forwarder_new_script_is_not_automatically_enabled():
    code = SOURCE.read_text()
    assert "RR_ALLOW_HARDWARE" in code
    assert "YES_I_HAVE_SECURED_ROVER" in code
