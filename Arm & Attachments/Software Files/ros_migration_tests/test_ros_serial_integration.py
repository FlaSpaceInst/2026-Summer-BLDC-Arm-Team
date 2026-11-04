"""Exercise the real ROS subscriber callbacks with fake ROS and Arduino ports."""
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class FakeLogger:
    def __init__(self):
        self.errors = []
    def info(self, message):
        pass
    def debug(self, message):
        pass
    def error(self, message):
        self.errors.append(message)


class FakePublisher:
    def __init__(self):
        self.messages = []
    def publish(self, message):
        self.messages.append(message.data)


class FakeNode:
    def __init__(self, name):
        self.name = name
        self.publisher = FakePublisher()
        self.subscriptions = {}
        self.logger = FakeLogger()
    def create_publisher(self, messageType, topic, queueSize):
        return self.publisher
    def create_subscription(self, messageType, topic, handler, queueSize):
        self.subscriptions[topic] = handler
        return handler
    def create_timer(self, period, callback):
        return callback
    def get_logger(self):
        return self.logger


class FakeSerial:
    instances = []
    failPaths = set()

    def __init__(self, path, baudrate, write_timeout, exclusive=False):
        self.path = path
        self.is_open = True
        self.frames = []
        self.baudrate = baudrate
        self.write_timeout = write_timeout
        self.exclusive = exclusive
        FakeSerial.instances.append(self)

    def write(self, frame):
        if self.path in self.failPaths:
            raise FakeSerialError('mock USB serial write failure')
        self.frames.append(frame)
        return len(frame)

    def flush(self):
        pass
    def close(self):
        self.is_open = False


class FakeSerialError(Exception):
    pass


class FakeString:
    def __init__(self):
        self.data = ''


class FakeTwist:
    def __init__(self, linearX=0, angularZ=0):
        self.linear = types.SimpleNamespace(x=linearX)
        self.angular = types.SimpleNamespace(z=angularZ)


def installStubs():
    rclpy = types.ModuleType('rclpy')
    rclpy.init = lambda: None
    rclpy.ok = lambda: False
    rclpy.shutdown = lambda: None
    rclpy.spin = lambda node: None
    nodeModule = types.ModuleType('rclpy.node')
    nodeModule.Node = FakeNode
    rclpy.node = nodeModule
    geometry = types.ModuleType('geometry_msgs')
    geometryMsg = types.ModuleType('geometry_msgs.msg')
    geometryMsg.Twist = FakeTwist
    geometry.msg = geometryMsg
    std = types.ModuleType('std_msgs')
    stdMsg = types.ModuleType('std_msgs.msg')
    stdMsg.String = FakeString
    std.msg = stdMsg
    serial = types.ModuleType('serial')
    serial.Serial = FakeSerial
    serial.SerialException = FakeSerialError
    serial.SerialTimeoutException = FakeSerialError
    for name, module in {
        'rclpy': rclpy, 'rclpy.node': nodeModule,
        'geometry_msgs': geometry, 'geometry_msgs.msg': geometryMsg,
        'std_msgs': std, 'std_msgs.msg': stdMsg,
        'serial': serial,
    }.items():
        sys.modules[name] = module


installStubs()
sys.path.insert(0, str(ROOT / 'ezrassor_controller_server' / 'source'))
from ezrassor_controller_server import ros_serial_driver as subscriberModule


class SubscriberIntegrationTests(unittest.TestCase):
    def setUp(self):
        FakeSerial.instances.clear()
        FakeSerial.failPaths.clear()

    def startDriver(self, wheelPort=None, enableBase=False):
        return subscriberModule.RassorDriverSubscriber(
            armPort='/dev/arm',
            handPort='/dev/hand',
            wheelPort=wheelPort,
            enableBase=enableBase,
            serialFactory=FakeSerial,
            bootDelaySeconds=0.0,
        )

    def test_split_arm_and_hand_serial_routing(self):
        node = self.startDriver()
        msg = FakeString()
        msg.data = json.dumps({
            'shoulder_joint_action': 'POSITIVE',
            'forearm_joint_action': 'NEGATIVE',
            'end_effector_action': 'POSITIVE',
        })
        node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [b'\x0f', b'\x13'])
        self.assertEqual(node.ports['hand'].frames, [b'\x09'])
        self.assertNotIn('wheels', node.ports)

    def test_release_sends_stop_to_correct_board(self):
        node = self.startDriver()
        for payload in (
            {'shoulder_joint_action': 'POSITIVE'},
            {'shoulder_joint_action': 'STOP'},
            {'shoulder_joint_action': 'NEGATIVE'},
            {'shoulder_joint_action': 'STOP'},
            {'end_effector_action': 'POSITIVE'},
            {'end_effector_action': 'STOP'},
        ):
            msg = FakeString()
            msg.data = json.dumps(payload)
            node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [b'\x0f', b'\x11', b'\x10', b'\x11'])
        self.assertEqual(node.ports['hand'].frames, [b'\x09', b'\x0b'])

    def test_invalid_mixed_message_never_moves_arm(self):
        node = self.startDriver()
        msg = FakeString()
        msg.data = '{"shoulder_joint_action":"POSITIVE", "end_effector_action":"BAD"}'
        node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [])
        self.assertEqual(node.ports['hand'].frames, [])

    def test_stop_all_reaches_arm_and_hand(self):
        node = self.startDriver()
        msg = FakeString()
        msg.data = '{"shoulder_joint_action":"STOP", "forearm_joint_action":"STOP", "end_effector_action":"STOP"}'
        node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [b'\x11', b'\x14'])
        self.assertEqual(node.ports['hand'].frames, [b'\x0b'])

    def test_wheels_binary_protocol(self):
        node = self.startDriver('/dev/wheels')
        node.onWheel(FakeTwist(linearX=1))
        node.onWheel(FakeTwist(angularZ=-1))
        node.onWheel(FakeTwist())
        self.assertEqual(node.ports['wheels'].frames, [b'\x19', b'\x01', b'\x00', b'\x19', b'\x04', b'\x00'])

    def test_base_requires_wheels_port(self):
        with self.assertRaisesRegex(ValueError, 'Wheels Arduino'):
            self.startDriver(enableBase=True)

    def test_duplicate_serial_alias_is_rejected(self):
        with self.assertRaises(ValueError):
            subscriberModule.RassorDriverSubscriber('/dev/test', '/dev/test', serialFactory=FakeSerial)

    def test_base_disabled_until_verified(self):
        node = self.startDriver('/dev/wheels')
        msg = FakeString()
        msg.data = '{"plate_joint_action":"POSITIVE"}'
        node.onArmJson(msg)
        self.assertEqual(node.ports['wheels'].frames, [])
        self.assertTrue(node.get_logger().errors)

    def test_base_explicitly_enabled(self):
        node = self.startDriver('/dev/wheels', enableBase=True)
        msg = FakeString()
        msg.data = '{"plate_joint_action":"POSITIVE"}'
        node.onArmJson(msg)
        self.assertEqual(node.ports['wheels'].frames, [b'\x0c'])

    def test_failing_hand_port_does_not_reroute_commands(self):
        node = self.startDriver()
        FakeSerial.failPaths.add('/dev/hand')
        msg = FakeString()
        msg.data = '{"end_effector_action":"POSITIVE"}'
        node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [])
        self.assertFalse(node.portHealthy['hand'])
        self.assertFalse(json.loads(node.publisher.messages[-1])['handOpen'])

    def test_serial_boot_delay_refuses_initial_movements(self):
        node = subscriberModule.RassorDriverSubscriber(
            armPort='/dev/arm',
            handPort='/dev/hand',
            serialFactory=FakeSerial,
            bootDelaySeconds=30,
        )
        msg = FakeString()
        msg.data = '{"shoulder_joint_action":"POSITIVE"}'
        node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [])
        self.assertFalse(json.loads(node.publisher.messages[-1])['armOpen'])

    def test_http_contract_to_ros_to_serial_mock(self):
        # Emulates the server publishing a validated JSON ROS message.
        from ezrassor_controller_server.arm_request import splitArmRequest, encodeArmRequest
        node = self.startDriver()
        armActions, roverActions = splitArmRequest({
            'shoulder_joint_action': 'POSITIVE',
            'end_effector_action': 'NEGATIVE',
        })
        self.assertEqual(roverActions, {})
        msg = FakeString()
        msg.data = encodeArmRequest(armActions)
        node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [b'\x0f'])
        self.assertEqual(node.ports['hand'].frames, [b'\x0a'])

    def test_three_arduinos_have_exclusive_binary_115200_links(self):
        node = self.startDriver('/dev/wheels')
        for name, device in (
            ('wheels', '/dev/wheels'),
            ('arm', '/dev/arm'),
            ('hand', '/dev/hand'),
        ):
            with self.subTest(board=name):
                self.assertEqual(node.ports[name].path, device)
                self.assertEqual(node.ports[name].baudrate, 115200)
                self.assertTrue(node.ports[name].exclusive)

        node.onWheel(FakeTwist(linearX=1))
        msg = FakeString()
        msg.data = json.dumps({
            'shoulder_joint_action': 'POSITIVE',
            'end_effector_action': 'POSITIVE',
        })
        node.onArmJson(msg)
        self.assertEqual(node.ports['wheels'].frames, [b'\x19', b'\x01'])
        self.assertEqual(json.loads(node.publisher.messages[-1])['serialProtocol'], 'binary')
        self.assertEqual(node.ports['arm'].frames, [b'\x0f'])
        self.assertEqual(node.ports['hand'].frames, [b'\x09'])
        for port in node.ports.values():
            self.assertTrue(all(len(frame) == 1 for frame in port.frames))

    def test_shutdown_stops_each_owned_port(self):
        node = self.startDriver('/dev/wheels')
        node.closePorts()
        self.assertEqual(node.ports['arm'].frames, [b'\x17'])
        self.assertEqual(node.ports['hand'].frames, [b'\x0b'])
        self.assertEqual(node.ports['wheels'].frames, [b'\x00'])
        self.assertFalse(node.ports['arm'].is_open)


if __name__ == '__main__':
    unittest.main()
