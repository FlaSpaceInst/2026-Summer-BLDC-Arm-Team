"""Pure protocol checks that run without ROS or hardware."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'ezrassor_controller_server' / 'source'))
from ezrassor_controller_server.ros_motor_protocol import decodeArmPayload, encodeWheel, wheelDirection, splitArmPayload

ARM_REQUEST_FILE = ROOT / 'ezrassor_controller_server' / 'source' / 'ezrassor_controller_server' / 'arm_request.py'
spec = importlib.util.spec_from_file_location('arm_request_under_test', ARM_REQUEST_FILE)
armRequest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(armRequest)


class ProtocolTests(unittest.TestCase):
    def test_shoulder_commands(self):
        self.assertEqual(decodeArmPayload({'shoulder_joint_action': 'POSITIVE'}), [('arm', 0x0F, 'shoulder_joint_action')])
        self.assertEqual(decodeArmPayload({'shoulder_joint_action': 'NEGATIVE'}), [('arm', 0x10, 'shoulder_joint_action')])
        self.assertEqual(decodeArmPayload({'shoulder_joint_action': 'STOP'}), [('arm', 0x11, 'shoulder_joint_action')])

    def test_forearm_commands(self):
        self.assertEqual(decodeArmPayload({'forearm_joint_action': 'POSITIVE'}), [('arm', 0x12, 'forearm_joint_action')])
        self.assertEqual(decodeArmPayload({'forearm_joint_action': 'NEGATIVE'}), [('arm', 0x13, 'forearm_joint_action')])
        self.assertEqual(decodeArmPayload({'forearm_joint_action': 'STOP'}), [('arm', 0x14, 'forearm_joint_action')])

    def test_hand_commands(self):
        self.assertEqual(decodeArmPayload({'end_effector_action': 'POSITIVE'}), [('hand', 0x09, 'end_effector_action')])
        self.assertEqual(decodeArmPayload({'end_effector_action': 'NEGATIVE'}), [('hand', 0x0A, 'end_effector_action')])
        self.assertEqual(decodeArmPayload({'end_effector_action': 'STOP'}), [('hand', 0x0B, 'end_effector_action')])

    def test_multi_joint_stop(self):
        payload = armRequest.stopArmActions()
        commands = decodeArmPayload(payload)
        self.assertEqual(commands, [
            ('arm', 0x11, 'shoulder_joint_action'),
            ('arm', 0x14, 'forearm_joint_action'),
            ('hand', 0x0B, 'end_effector_action'),
        ])

    def test_base_disabled(self):
        with self.assertRaisesRegex(ValueError, 'Base rotation is disabled'):
            decodeArmPayload({'plate_joint_action': 'POSITIVE'})
        self.assertEqual(decodeArmPayload({'plate_joint_action': 'STOP'}), [])

    def test_base_explicitly_enabled(self):
        self.assertEqual(decodeArmPayload({'plate_joint_action': 'NEGATIVE'}, enableBase=True), [('wheels', 0x0D, 'plate_joint_action')])

    def test_validate_complete_payload_before_writes(self):
        with self.assertRaises(ValueError):
            decodeArmPayload({'shoulder_joint_action': 'POSITIVE', 'end_effector_action': 'INVALID'})
        with self.assertRaises(ValueError):
            decodeArmPayload({'shoulder_joint_action': 'POSITIVE', 'unknown_joint_action': 'STOP'})
        with self.assertRaises(ValueError):
            decodeArmPayload([])

    def test_binary_wheel_commands(self):
        self.assertEqual(encodeWheel('STOP'), b'\x00')
        self.assertEqual(encodeWheel('FWD'), b'\x01')
        self.assertEqual(encodeWheel('REV'), b'\x02')
        self.assertEqual(encodeWheel('LEFT'), b'\x03')
        self.assertEqual(encodeWheel('RIGHT'), b'\x04')
        with self.assertRaises(ValueError):
            encodeWheel('UNKNOWN')
        with self.assertRaises(TypeError):
            encodeWheel('FWD', 'text')

    def test_wheel_directions(self):
        self.assertEqual(wheelDirection(0, 0), 'STOP')
        self.assertEqual(wheelDirection(1, 0), 'FWD')
        self.assertEqual(wheelDirection(-1, 0), 'REV')
        self.assertEqual(wheelDirection(0, 1), 'LEFT')
        self.assertEqual(wheelDirection(0, -1), 'RIGHT')

    def test_server_arm_validation(self):
        arm, rover = armRequest.splitArmRequest({
            'shoulder_joint_action': 'POSITIVE',
            'end_effector_action': 'NEGATIVE',
            'wheel_action': {'linear_x': 0, 'angular_z': 0},
        })
        self.assertEqual(arm, {'shoulder_joint_action': 'POSITIVE', 'end_effector_action': 'NEGATIVE'})
        self.assertEqual(rover, {'wheel_action': {'linear_x': 0, 'angular_z': 0}})
        with self.assertRaises(ValueError):
            armRequest.splitArmRequest({'end_effector_action': 9})
        self.assertEqual(json.loads(armRequest.encodeArmRequest(arm)), arm)

    def test_no_ros_health_blocks_movement_not_stop(self):
        health = armRequest.formatDriverHealth(None, None)
        self.assertFalse(armRequest.checkArmReadiness({'shoulder_joint_action': 'POSITIVE'}, health)[0])
        self.assertFalse(armRequest.checkArmReadiness({'end_effector_action': 'NEGATIVE'}, health)[0])
        self.assertTrue(armRequest.checkArmReadiness({'end_effector_action': 'STOP'}, health)[0])

    def test_health_gate_blocks_only_missing_joint(self):
        health = {'armOpen': True, 'handOpen': False, 'wheelsOpen': False, 'baseEnabled': False}
        self.assertTrue(armRequest.checkArmReadiness({'shoulder_joint_action': 'POSITIVE'}, health)[0])
        self.assertFalse(armRequest.checkArmReadiness({'end_effector_action': 'POSITIVE'}, health)[0])
        self.assertFalse(armRequest.checkArmReadiness({'plate_joint_action': 'POSITIVE'}, health)[0])

    def test_health_data_requires_fresh_status(self):
        data = {'armOpen': True, 'handOpen': True, 'wheelsOpen': False, 'baseEnabled': False}
        self.assertTrue(armRequest.formatDriverHealth(data, 0.5)['ready'])
        self.assertFalse(armRequest.formatDriverHealth(data, 2.5)['ready'])
        self.assertFalse(armRequest.formatDriverHealth(None, None)['ready'])
        self.assertEqual(armRequest.formatDriverHealth(None, None)['serialProtocol'], 'binary')
        self.assertFalse(armRequest.formatDriverHealth(data, -1)['ready'])
        self.assertFalse(armRequest.formatDriverHealth({'armOpen': True, 'handOpen': 1}, 0.0)['ready'])


if __name__ == '__main__':
    unittest.main()
