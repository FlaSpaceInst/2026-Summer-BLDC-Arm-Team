"""Static source contract tests; not Arduino compilation or motor validation."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FW = ROOT / 'firmware_reference/team_2026_candidate'
HEADER = (FW / 'commands.h').read_text()
WHEELS = (FW / 'arduino_wheels.ino').read_text()
ARM = (FW / 'arduino_arm.ino').read_text()


def test_2026_commands_match_staged_ros_serial_mapping():
    values = {
        'STOP': '0x00', 'FWD': '0x01', 'REV': '0x02',
        'ARM_ROTATE_CW': '0x0C', 'ARM_ROTATE_CCW': '0x0D',
        'ARM_STOP_ROTATE': '0x0E', 'ARM_FWD_SHOULDER': '0x0F',
        'ARM_REV_SHOULDER': '0x10', 'ARM_STOP_SHOULDER': '0x11',
        'ARM_FWD_ELBOW': '0x12', 'ARM_REV_ELBOW': '0x13',
        'ARM_STOP_ELBOW': '0x14', 'OPEN_EFFECTOR': '0x09',
        'CLOSE_EFFECTOR': '0x0A', 'STOP_EFFECTOR': '0x0B',
        'ARM_STOP_ALL': '0x18',
    }
    for name, value in values.items():
        regex = r'\b' + name + r'\s*=\s*' + value + r'\b'
        assert re.search(regex, HEADER, re.IGNORECASE), (name, value)


def test_team_wheel_sketch_contains_all_three_base_stepper_cases():
    for label in ('ARM_ROTATE_CW', 'ARM_ROTATE_CCW', 'ARM_STOP_ROTATE'):
        assert re.search(r'\bcase\s+' + label + r'\s*:', WHEELS)
    assert 'DRV8825 armBase(Z_STEP_PIN, Z_DIR_PIN, Z_ENABLE_PIN' in WHEELS
    assert re.search(r'\bcase\s+ARM_STOP_ROTATE\s*:\s*armBase\.set_speed\(0\)', WHEELS)


def test_team_arm_sketch_has_serial_command_handling():
    assert 'Serial.begin(115200)' in ARM
    assert 'ARM_STOP_ALL' in ARM
