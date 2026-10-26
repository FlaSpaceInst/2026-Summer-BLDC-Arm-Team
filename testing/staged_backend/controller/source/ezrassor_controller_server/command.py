"""Data structures that make up an EZRASSOR command."""
import enum
import ezrassor_controller_server as server


def create_command(request):
    """Create a command from a remote request.

    This function presumes that the request is valid.
    """

    # Set a routine action, if available in the request.
    routine_action = None
    if server.ROUTINE_ACTION_KEY in request:
        routine_action = RoutineAction[request[server.ROUTINE_ACTION_KEY]]

    # Set the wheel action, if available in the request.
    wheel_action = None
    if server.WHEEL_ACTION_KEY in request:
        wheel_action = WheelAction(
            linear_x=request[server.WHEEL_ACTION_KEY][server.LINEAR_X_KEY],
            angular_z=request[server.WHEEL_ACTION_KEY][server.ANGULAR_Z_KEY],
        )

    # Set the front arm action, if available in the request.
    front_arm_action = None
    if server.FRONT_ARM_ACTION_KEY in request:
        front_arm_action = ArmAction[request[server.FRONT_ARM_ACTION_KEY]]

    # Set the back arm action, if available in the request.
    back_arm_action = None
    if server.BACK_ARM_ACTION_KEY in request:
        back_arm_action = ArmAction[request[server.BACK_ARM_ACTION_KEY]]

    # Set the front drum action, if available in the request.
    front_drum_action = None
    if server.FRONT_DRUM_ACTION_KEY in request:
        front_drum_action = DrumAction[request[server.FRONT_DRUM_ACTION_KEY]]

    # Set the back drum action, if available in the request.
    back_drum_action = None
    if server.BACK_DRUM_ACTION_KEY in request:
        back_drum_action = DrumAction[request[server.BACK_DRUM_ACTION_KEY]]

    return Command(
        wheel_action,
        front_arm_action,
        back_arm_action,
        front_drum_action,
        back_drum_action,
        routine_action,
    )


class Command:
    """A command containing actions for an EZRASSOR."""

    def __init__(
        self,
        wheel_action,
        front_arm_action,
        back_arm_action,
        front_drum_action,
        back_drum_action,
        routine_action,
    ):
        """Initialize this command with actions."""
        self.wheel_action = wheel_action
        self.front_arm_action = front_arm_action
        self.back_arm_action = back_arm_action
        self.front_drum_action = front_drum_action
        self.back_drum_action = back_drum_action
        self.routine_action = routine_action


class MetaActionEnum(enum.EnumMeta):
    """Metaclass which modifies the enum creation procedure.

    Metaclasses are like class templates (they define how to create other
    classes). Due to the nature of the Python enum system, new enum
    functionality must be provided via a metaclass. This metaclass is used to
    create enums that support 'in' checks (e.g. '"KEY" in MyEnum') and
    stringification (e.g. 'str(MyEnum)').
    """

    def __contains__(self, key):
        """Check if a key exists in the enum."""
        try:
            self[key]

            return True
        except KeyError:
            return False

    def __str__(self):
        """Create a string containing all keys in the enum."""
        return ", ".join(self.__members__.keys())


class WheelAction:
    """This action describes how to move the wheels of an EZRASSOR."""

    def __init__(self, linear_x, angular_z):
        """Initialize this action with movement floats."""
        self.linear_x = linear_x
        self.angular_z = angular_z


class ArmAction(enum.Enum, metaclass=MetaActionEnum):
    """This action describes how to move the arms of an EZRASSOR."""

    LOWER = -1.0
    STOP = 0.0
    RAISE = 1.0


class DrumAction(enum.Enum, metaclass=MetaActionEnum):
    """This action describes how to move the drums of an EZRASSOR."""

    DUMP = -1.0
    STOP = 0.0
    DIG = 1.0


class RoutineAction(enum.Enum, metaclass=MetaActionEnum):
    """This action describes which routine to execute for an EZRASSOR."""

    AUTO_DRIVE = 0b000001
    AUTO_DIG = 0b000010
    AUTO_DUMP = 0b000100
    AUTO_DOCK = 0b001000
    FULL_AUTONOMY = 0b010000
    STOP = 0b100000
