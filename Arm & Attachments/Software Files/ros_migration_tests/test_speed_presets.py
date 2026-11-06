"""Validate speed preset protocol against firmware and mocked ROS links."""
import json
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ezrassor_controller_server' / 'source'))
from ezrassor_controller_server import arm_request as armRequest
from ezrassor_controller_server.ros_motor_protocol import (
    SPEED_COMMANDS, decodeArmPayload, encodeSpeed, wheelSpeedFromTwist
)
import test_ros_serial_integration as mockDriver
import test_arduino_command_headers as headerChecks


class SpeedPresetTests(unittest.TestCase):
    def test_binary_speed_codes_match_each_board_header(self):
        names = {
            'wheels': ('arduino_wheels', 'WHEEL_SPEED'),
            'shoulder_joint_action': ('arduino_arm', 'SHOULDER_SPEED'),
            'forearm_joint_action': ('arduino_arm', 'FOREARM_SPEED'),
            'end_effector_action': ('arduino_hand', 'GRIPPER_SPEED'),
            'plate_joint_action': ('arduino_wheels', 'BASE_SPEED'),
        }
        headers = headerChecks.ArduinoCommandHeaderTests()
        for motor, (board, prefix) in names.items():
            commands = headers.readCommands(board)
            for level, suffix in enumerate(('SLOW', 'MEDIUM', 'FAST'), start=1):
                with self.subTest(board=board, motor=motor, level=level):
                    self.assertEqual(encodeSpeed(motor, level), bytes([commands[prefix + '_' + suffix]]))
                    self.assertEqual(SPEED_COMMANDS[motor][level - 1], commands[prefix + '_' + suffix])

    def test_arm_preset_written_before_movement(self):
        self.assertEqual(decodeArmPayload({'shoulder_joint_speed': 1, 'shoulder_joint_action': 'POSITIVE'}), [
            ('arm', 0x1C, 'shoulder_joint_speed'), ('arm', 0x0F, 'shoulder_joint_action')
        ])
        self.assertEqual(decodeArmPayload({'forearm_joint_speed': 3, 'forearm_joint_action': 'NEGATIVE'}), [
            ('arm', 0x21, 'forearm_joint_speed'), ('arm', 0x13, 'forearm_joint_action')
        ])
        self.assertEqual(decodeArmPayload({'end_effector_speed': 2, 'end_effector_action': 'POSITIVE'}), [
            ('hand', 0x23, 'end_effector_speed'), ('hand', 0x09, 'end_effector_action')
        ])

    def test_stops_never_require_or_send_speed(self):
        self.assertEqual(decodeArmPayload({'shoulder_joint_speed': 3, 'shoulder_joint_action': 'STOP'}), [
            ('arm', 0x11, 'shoulder_joint_action')
        ])
        self.assertEqual(decodeArmPayload({'end_effector_action': 'STOP'}), [
            ('hand', 0x0B, 'end_effector_action')
        ])

    def test_standalone_speed_only_configures_without_motion(self):
        self.assertEqual(decodeArmPayload({'forearm_joint_speed': 2}), [
            ('arm', 0x20, 'forearm_joint_speed')
        ])
        with self.assertRaises(ValueError):
            decodeArmPayload({'plate_joint_speed': 2}, enableBase=False)
        self.assertEqual(decodeArmPayload({'plate_joint_speed': 2}, enableBase=True), [
            ('wheels', 0x26, 'plate_joint_speed')
        ])

    def test_invalid_speed_rejected_before_motion(self):
        for invalid in (0, 4, -1, 1.5, True, '2', None):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    decodeArmPayload({'shoulder_joint_action': 'POSITIVE', 'shoulder_joint_speed': invalid})
                with self.assertRaises(ValueError):
                    armRequest.splitArmRequest({'shoulder_joint_action': 'POSITIVE', 'shoulder_joint_speed': invalid})

    def test_wheel_magnitude_validation(self):
        self.assertIsNone(wheelSpeedFromTwist(0, 0))
        self.assertEqual(wheelSpeedFromTwist(-3, 0), 3)
        self.assertEqual(wheelSpeedFromTwist(0, 2), 2)
        for values in ((0.5, 0), (4, 0), (1, -1)):
            with self.subTest(values=values):
                with self.assertRaises(ValueError):
                    wheelSpeedFromTwist(*values)

    def test_server_readiness_checks_speed_messages(self):
        actions, other = armRequest.splitArmRequest({'shoulder_joint_action': 'POSITIVE', 'shoulder_joint_speed': 2})
        self.assertEqual(other, {})
        self.assertEqual(actions['shoulder_joint_speed'], 2)
        allowed, _ = armRequest.checkArmReadiness(actions, {'armOpen': False})
        self.assertFalse(allowed)
        allowed, _ = armRequest.checkArmReadiness(actions, {'armOpen': True})
        self.assertTrue(allowed)

    def test_driver_speed_change_and_stop(self):
        helper = mockDriver.SubscriberIntegrationTests()
        helper.setUp()
        node = helper.startDriver('/dev/wheels')
        node.onWheel(mockDriver.FakeTwist(linearX=1))
        node.onWheel(mockDriver.FakeTwist(linearX=3))
        node.onWheel(mockDriver.FakeTwist())
        self.assertEqual(node.ports['wheels'].frames, [b'\x19', b'\x01', b'\x1b', b'\x00'])
        node.onWheel(mockDriver.FakeTwist(linearX=4))
        self.assertEqual(node.ports['wheels'].frames[-1], b'\x00')

    def test_wheel_same_direction_advances_speed_without_restart(self):
        helper = mockDriver.SubscriberIntegrationTests()
        helper.setUp()
        node = helper.startDriver('/dev/wheels')
        for level in (1, 2, 3, 3):
            node.onWheel(mockDriver.FakeTwist(linearX=level))
        self.assertEqual(node.ports['wheels'].frames, [
            b'\x19', b'\x01', b'\x1a', b'\x1b'
        ])
        node.onWheel(mockDriver.FakeTwist())
        node.onWheel(mockDriver.FakeTwist(linearX=1))
        self.assertEqual(node.ports['wheels'].frames[-3:], [
            b'\x00', b'\x19', b'\x01'
        ])

    def test_driver_routes_speed_to_correct_board(self):
        helper = mockDriver.SubscriberIntegrationTests()
        helper.setUp()
        node = helper.startDriver('/dev/wheels', enableBase=True)
        msg = mockDriver.FakeString()
        msg.data = json.dumps({
            'shoulder_joint_speed': 1, 'shoulder_joint_action': 'POSITIVE',
            'end_effector_speed': 3, 'end_effector_action': 'NEGATIVE',
            'plate_joint_speed': 2, 'plate_joint_action': 'POSITIVE',
        })
        node.onArmJson(msg)
        self.assertEqual(node.ports['arm'].frames, [b'\x1c', b'\x0f'])
        self.assertEqual(node.ports['hand'].frames, [b'\x24', b'\x0a'])
        self.assertEqual(node.ports['wheels'].frames, [b'\x26', b'\x0c'])

    def test_firmware_handlers_have_speed_cases(self):
        for board, names in {
            'arduino_wheels': ('WHEEL_SPEED_SLOW', 'WHEEL_SPEED_MEDIUM', 'WHEEL_SPEED_FAST', 'BASE_SPEED_SLOW'),
            'arduino_arm': ('SHOULDER_SPEED_SLOW', 'SHOULDER_SPEED_MEDIUM', 'SHOULDER_SPEED_FAST', 'FOREARM_SPEED_SLOW'),
            'arduino_hand': ('GRIPPER_SPEED_SLOW', 'GRIPPER_SPEED_MEDIUM', 'GRIPPER_SPEED_FAST'),
        }.items():
            code = (ROOT / board / (board + '.ino')).read_text()
            for name in names:
                with self.subTest(board=board, name=name):
                    self.assertIn('case ' + name + ':', code)


if __name__ == '__main__':
    unittest.main()
