import ezrassor_controller_server as server


WHEEL_ACTION_KEY = "wheel_action"
""" Coordinates x and y keys"""
LINEAR_X_KEY_AUTO = "x"
LINEAR_Y_KEY_AUTO = "y"

""" Twist Keys"""
LINEAR_X_KEY = "linear_x"
ANGULAR_Z_KEY = "angular_z"
LINEAR_Y_KEY = "linear_y"
ANGULAR_Y_KEY = "angular_y"

""" Shoulder key """
SHOULDER_ACTION_KEY = "shoulder_action"
""" idek man """
FRONT_ARM_ACTION_KEY = "front_arm_action"
BACK_ARM_ACTION_KEY = "back_arm_action"

FRONT_DRUM_ACTION_KEY = "front_drum_action"
BACK_DRUM_ACTION_KEY = "back_drum_action"
ROUTINE_ACTION_KEY = "routine_action"
AUTONOMOUS_ACTION_KEY = "target_coordinate"


def verify(request):
    """Validate the contents of the request."""
    if not isinstance(request, dict):
        raise VerificationError("request body must be a JSON object")

    for key in request.keys():
        #wheel check
        if key == WHEEL_ACTION_KEY:
            if not isinstance(request[key], dict):
                raise VerificationError(
                    f"missing {LINEAR_X_KEY} and {ANGULAR_Z_KEY} and {ANGULAR_Y_KEY} and {LINEAR_Y_KEY} for {key}",
                )
            if LINEAR_X_KEY not in request[key]:
                raise VerificationError(f"missing {LINEAR_X_KEY} for {key}")
            if ANGULAR_Z_KEY not in request[key]:
                raise VerificationError(f"missing {ANGULAR_Z_KEY} for {key}")

        # checking shoulder key
        elif key == SHOULDER_ACTION_KEY:
            if not isinstance(request[key], dict):
                raise VerificationError(
                    f"missing {LINEAR_Y_KEY} and {ANGULAR_Y_KEY} and {LINEAR_X_KEY} and {ANGULAR_Z_KEY} for {key}",
                )
            if LINEAR_Y_KEY not in request[key]:
                raise VerificationError(f"missing {LINEAR_Y_KEY} for {key}")
            if ANGULAR_Y_KEY not in request[key]:
                raise VerificationError(f"missing {ANGULAR_Y_KEY} for {key}")
            if LINEAR_X_KEY not in request[key]:
                raise VerificationError(f"missing {LINEAR_X_KEY} for {key}")
            if ANGULAR_Z_KEY not in request[key]:
                raise VerificationError(f"missing {ANGULAR_Z_KEY} for {key}")
        # checking arm key
        elif key == FRONT_ARM_ACTION_KEY or key == BACK_ARM_ACTION_KEY:
            if request[key] not in server.ArmAction:
                raise VerificationError(
                    f"{key} value must be one of [{str(server.ArmAction)}]",
                )
        elif key == FRONT_DRUM_ACTION_KEY or key == BACK_DRUM_ACTION_KEY:
            if not isinstance(request[key], dict):
                raise VerificationError(
                    f"missing {LINEAR_X_KEY} for {key}",
                )
            if LINEAR_X_KEY not in request[key]:
                raise VerificationError(f"missing {LINEAR_X_KEY} for {key}")
        elif key == ROUTINE_ACTION_KEY:
            if request[key] not in server.RoutineAction:
                raise VerificationError(
                    f"{key} value must be one of [{str(server.RoutineAction)}]",
                )
        elif key == AUTONOMOUS_ACTION_KEY:
            if LINEAR_X_KEY_AUTO not in request[key]:
                raise VerificationError(f"missing {LINEAR_X_KEY_AUTO} for {key}")
            if LINEAR_Y_KEY_AUTO not in request[key]:
                raise VerificationError(f"missing {LINEAR_Y_KEY_AUTO} for {key}")
        else:
            raise VerificationError(f"unknown key: {key}")


class VerificationError(Exception):
    """Encapsulate verification errors."""

    def __init__(self, message):
        """Initialize this error with a message."""
        self.message = message

    def __str__(self):
        """Create a human-readable representation of this error."""
        return self.message
