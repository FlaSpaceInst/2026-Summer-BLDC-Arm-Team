"""Tests for the command conversion code in this module."""
import ezrassor_controller_server as server


def test_create_command_with_an_empty_request():
    """Should create a command that does nothing."""
    command = server.create_command({})

    assert command.routine_action is None
    assert command.wheel_action is None
    assert command.front_arm_action is None
    assert command.back_arm_action is None
    assert command.front_drum_action is None
    assert command.back_drum_action is None


def test_create_command_with_routine_action_in_request():
    """Should create a command that starts a routine."""
    command = server.create_command(
        {server.ROUTINE_ACTION_KEY: server.RoutineAction.AUTO_DRIVE.name},
    )

    assert command.routine_action is server.RoutineAction.AUTO_DRIVE
    assert command.wheel_action is None
    assert command.front_arm_action is None
    assert command.back_arm_action is None
    assert command.front_drum_action is None
    assert command.back_drum_action is None


def test_create_command_with_wheel_action_in_request():
    """Should create a command that moves the wheels."""
    command = server.create_command(
        {
            server.WHEEL_ACTION_KEY: {
                server.LINEAR_X_KEY: 1.0,
                server.ANGULAR_Z_KEY: 0.0,
            },
        },
    )

    assert command.routine_action is None
    assert command.wheel_action is not None
    assert command.wheel_action.linear_x == 1.0
    assert command.wheel_action.angular_z == 0.0
    assert command.front_arm_action is None
    assert command.back_arm_action is None
    assert command.front_drum_action is None
    assert command.back_drum_action is None


def test_create_command_with_front_arm_action_in_request():
    """Should create a command that manipulates the front arm."""
    command = server.create_command(
        {server.FRONT_ARM_ACTION_KEY: server.ArmAction.RAISE.name},
    )

    assert command.routine_action is None
    assert command.wheel_action is None
    assert command.front_arm_action is server.ArmAction.RAISE
    assert command.back_arm_action is None
    assert command.front_drum_action is None
    assert command.back_drum_action is None


def test_create_command_with_back_arm_action_in_request():
    """Should create a command that manipulates the back arm."""
    command = server.create_command(
        {server.BACK_ARM_ACTION_KEY: server.ArmAction.RAISE.name},
    )

    assert command.routine_action is None
    assert command.wheel_action is None
    assert command.front_arm_action is None
    assert command.back_arm_action is server.ArmAction.RAISE
    assert command.front_drum_action is None
    assert command.back_drum_action is None


def test_create_command_with_front_drum_action_in_request():
    """Should create a command that manipulates the front drum."""
    command = server.create_command(
        {server.FRONT_DRUM_ACTION_KEY: server.DrumAction.DIG.name},
    )

    assert command.routine_action is None
    assert command.wheel_action is None
    assert command.front_arm_action is None
    assert command.back_arm_action is None
    assert command.front_drum_action is server.DrumAction.DIG
    assert command.back_drum_action is None


def test_create_command_with_back_drum_action_in_request():
    """Should create a command that manipulates the back drum."""
    command = server.create_command(
        {server.BACK_DRUM_ACTION_KEY: server.DrumAction.DIG.name},
    )

    assert command.routine_action is None
    assert command.wheel_action is None
    assert command.front_arm_action is None
    assert command.back_arm_action is None
    assert command.front_drum_action is None
    assert command.back_drum_action is server.DrumAction.DIG


def test_create_command_with_serveral_actions_in_request():
    """Should create a command that instructs the EZRASSOR to do many things.

    This test ensures that complex requests are fully translated.
    """
    command = server.create_command(
        {
            server.ROUTINE_ACTION_KEY: server.RoutineAction.AUTO_DRIVE.name,
            server.WHEEL_ACTION_KEY: {
                server.LINEAR_X_KEY: 1.0,
                server.ANGULAR_Z_KEY: 0.0,
            },
            server.FRONT_ARM_ACTION_KEY: server.ArmAction.RAISE.name,
            server.BACK_ARM_ACTION_KEY: server.ArmAction.LOWER.name,
            server.FRONT_DRUM_ACTION_KEY: server.DrumAction.DIG.name,
            server.BACK_DRUM_ACTION_KEY: server.DrumAction.DUMP.name,
        },
    )

    assert command.routine_action is server.RoutineAction.AUTO_DRIVE
    assert command.wheel_action is not None
    assert command.wheel_action.linear_x == 1.0
    assert command.wheel_action.angular_z == 0.0
    assert command.front_arm_action is server.ArmAction.RAISE
    assert command.back_arm_action is server.ArmAction.LOWER
    assert command.front_drum_action is server.DrumAction.DIG
    assert command.back_drum_action is server.DrumAction.DUMP
