"""Test request verification in this module."""
import ezrassor_controller_server as server


def test_verify_with_empty_request():
    """Should do nothing because the an empty request is valid."""
    server.verify({})


def test_verify_with_valid_request():
    """Should do nothing because the request is valid."""
    server.verify(
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


def test_verify_with_wheel_action_without_subkeys_in_request():
    """Should fail because the wheel action is missing required subkeys."""
    try:
        server.verify({server.WHEEL_ACTION_KEY: "invalid"})
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert f"missing {server.LINEAR_X_KEY}" in error.message


def test_verify_with_missing_linear_x_key_in_request():
    """Should fail because the wheel action has no linear_x."""
    try:
        server.verify(
            {server.WHEEL_ACTION_KEY: {server.ANGULAR_Z_KEY: 0.0}},
        )
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert f"missing {server.LINEAR_X_KEY}" in error.message


def test_verify_with_missing_angular_z_key_in_request():
    """Should fail because the wheel action has no angular_z."""
    try:
        server.verify(
            {server.WHEEL_ACTION_KEY: {server.LINEAR_X_KEY: 0.0}},
        )
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert f"missing {server.ANGULAR_Z_KEY}" in error.message


def test_verify_with_invalid_linear_x_type_in_request():
    """Should fail because the wheel action's linear_x is the wrong type."""
    try:
        server.verify(
            {
                server.WHEEL_ACTION_KEY: {
                    server.LINEAR_X_KEY: "invalid",
                    server.ANGULAR_Z_KEY: 0.0,
                },
            },
        )
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "must be a float" in error.message


def test_verify_with_invalid_angular_z_type_in_request():
    """Should fail because the wheel action's angular_z is the wrong type."""
    try:
        server.verify(
            {
                server.WHEEL_ACTION_KEY: {
                    server.LINEAR_X_KEY: 0.0,
                    server.ANGULAR_Z_KEY: "invalid",
                },
            },
        )
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "must be a float" in error.message


def test_verify_with_unsupported_front_arm_action_in_request():
    """Should fail because the front arm action is not supported."""
    try:
        server.verify({server.FRONT_ARM_ACTION_KEY: "INVALID"})
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "value must be one of" in error.message


def test_verify_with_unsupported_back_arm_action_in_request():
    """Should fail because the back arm action is not supported."""
    try:
        server.verify({server.BACK_ARM_ACTION_KEY: "INVALID"})
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "value must be one of" in error.message


def test_verify_with_unsupported_front_drum_action_in_request():
    """Should fail because the front drum action is not supported."""
    try:
        server.verify({server.FRONT_DRUM_ACTION_KEY: "INVALID"})
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "value must be one of" in error.message


def test_verify_with_unsupported_back_drum_action_in_request():
    """Should fail because the back drum action is not supported."""
    try:
        server.verify({server.BACK_DRUM_ACTION_KEY: "INVALID"})
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "value must be one of" in error.message


def test_verify_with_unsupported_routine_action_in_request():
    """Should fail because the routine action is not supported."""
    try:
        server.verify({server.ROUTINE_ACTION_KEY: "INVALID"})
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "value must be one of" in error.message


def test_verify_with_unknown_key_in_request():
    """Should fail because the request contains an unknown key."""
    try:
        server.verify({"invalid": "invalid"})
        assert False, "verify() should have failed"
    except Exception as error:
        assert isinstance(error, server.VerificationError)
        assert "unknown key" in error.message
