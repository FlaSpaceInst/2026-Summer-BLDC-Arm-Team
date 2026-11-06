"""Check ROS command bytes against each Arduino's actual command enum.

Run against the complete repository after applying the ROS migration overlay.
No ROS installation or physical Arduino is needed.
"""

from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ezrassor_controller_server' / 'source'))
from ezrassor_controller_server.ros_motor_protocol import JOINT_BYTES, WHEEL_BINARY, encodeWheel


class ArduinoCommandHeaderTests(unittest.TestCase):
    def readCommands(self, board):
        path = ROOT / board / 'src' / 'commands.h'
        content = path.read_text(encoding='utf-8')
        entries = {}
        for line in content.splitlines():
            line = line.split('//', 1)[0]
            found = re.search(r'\b([A-Z][A-Z0-9_]*)\s*=\s*(0[xX][0-9a-fA-F]+|[0-9]+)', line)
            if found is not None:
                entries[found.group(1)] = int(found.group(2), 0)
        return entries

    def test_wheel_commands_match_header(self):
        wheelCommands = self.readCommands('arduino_wheels')
        for name, code in WHEEL_BINARY.items():
            with self.subTest(command=name):
                self.assertEqual(wheelCommands[name], code)
                self.assertEqual(encodeWheel(name), bytes([wheelCommands[name]]))
        for field, commandName in (
            ('POSITIVE', 'ARM_ROTATE_CW'),
            ('NEGATIVE', 'ARM_ROTATE_CCW'),
            ('STOP', 'ARM_STOP_ROTATE'),
        ):
            with self.subTest(baseAction=field):
                self.assertEqual(JOINT_BYTES['plate_joint_action'][field], wheelCommands[commandName])

    def test_shoulder_forearm_commands_match_header(self):
        armCommands = self.readCommands('arduino_arm')
        expected = {
            'shoulder_joint_action': {
                'POSITIVE': 'ARM_FWD_SHOULDER',
                'NEGATIVE': 'ARM_REV_SHOULDER',
                'STOP': 'ARM_STOP_SHOULDER',
            },
            'forearm_joint_action': {
                'POSITIVE': 'ARM_FWD_ELBOW',
                'NEGATIVE': 'ARM_REV_ELBOW',
                'STOP': 'ARM_STOP_ELBOW',
            },
        }
        for field, actions in expected.items():
            for action, commandName in actions.items():
                with self.subTest(field=field, action=action):
                    self.assertEqual(JOINT_BYTES[field][action], armCommands[commandName])
        self.assertEqual(armCommands['ARM_STOP_BOTH'], 0x17)

    def test_gripper_commands_match_header(self):
        handCommands = self.readCommands('arduino_hand')
        for action, commandName in (
            ('POSITIVE', 'OPEN_EFFECTOR'),
            ('NEGATIVE', 'CLOSE_EFFECTOR'),
            ('STOP', 'STOP_EFFECTOR'),
        ):
            with self.subTest(action=action):
                self.assertEqual(JOINT_BYTES['end_effector_action'][action], handCommands[commandName])

    def test_all_firmware_serial_receivers_use_one_byte(self):
        for board in ('arduino_wheels', 'arduino_arm', 'arduino_hand'):
            with self.subTest(board=board):
                path = ROOT / board / (board + '.ino')
                content = path.read_text(encoding='utf-8')
                # Strip comments before searching; commented-out debug instructions
                # are allowed, but must not be the active serial receive path.
                activeContent = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
                activeContent = '\n'.join(line.split('//', 1)[0] for line in activeContent.splitlines())
                self.assertRegex(activeContent, r'Serial\.read\s*\(')
                self.assertNotIn('readStringUntil', activeContent)
                self.assertIn('Serial.begin(115200)', activeContent)


if __name__ == '__main__':
    unittest.main()
