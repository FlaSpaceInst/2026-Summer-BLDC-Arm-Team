"""Staged Flask -> ROS 2 controller for legacy rover and new RE-RASSOR arm.

Not a replacement for the Pi's deployed controller until hardware interfaces
have been validated. New arm command publication is disabled by default.
"""

import os

import ezrassor_controller_server as server
import flask
import geometry_msgs.msg
import rclpy
import std_msgs.msg

from .arm_integration import (
    ArmCoordinator, ArmInputError, ArmInterlockError, ArmRateLimitError,
    is_arm_request,
)

NODE = 'controller_server'
QUEUE_SIZE = 10


def _namespace():
    namespace = os.environ.get('RR_ROVER_NAMESPACE', 'ezrassor')
    if not namespace or not all(char.isalnum() or char == '_' for char in namespace):
        raise ValueError('Invalid RR_ROVER_NAMESPACE.')
    return namespace


def create_app(node, enable_arm=False, namespace=None, coordinator_options=None):
    """Build an importable testable Flask server using the actual ROS publishers.

    Existing rover routes retain their request format and ROS message types.
    New messages are staged and require an explicitly enabled feature flag.
    """
    ns = namespace or _namespace()
    prefix = '/' + ns + '/'

    wheel_pub = node.create_publisher(geometry_msgs.msg.Twist, prefix + 'wheel_instructions', QUEUE_SIZE)
    front_arm_pub = node.create_publisher(std_msgs.msg.Float64, prefix + 'front_arm_instructions', QUEUE_SIZE)
    back_arm_pub = node.create_publisher(std_msgs.msg.Float64, prefix + 'back_arm_instructions', QUEUE_SIZE)
    front_drum_pub = node.create_publisher(std_msgs.msg.Float64, prefix + 'front_drum_instructions', QUEUE_SIZE)
    back_drum_pub = node.create_publisher(std_msgs.msg.Float64, prefix + 'back_drum_instructions', QUEUE_SIZE)
    routine_pub = node.create_publisher(std_msgs.msg.Int8, prefix + 'routine_actions', QUEUE_SIZE)

    coordinator = None
    if enable_arm:
        bldc_pub = node.create_publisher(std_msgs.msg.UInt8, prefix + 'bldc_command_byte', QUEUE_SIZE)
        base_pub = node.create_publisher(std_msgs.msg.UInt8, prefix + 'arm_base_command_byte', QUEUE_SIZE)

        def publish_byte(publisher, value):
            message = std_msgs.msg.UInt8()
            message.data = value
            publisher.publish(message)

        def publish_wheel_stop():
            message = geometry_msgs.msg.Twist()
            message.linear.x = 0.0
            message.angular.z = 0.0
            wheel_pub.publish(message)

        coordinator = ArmCoordinator(
            lambda value: publish_byte(bldc_pub, value),
            lambda value: publish_byte(base_pub, value),
            publish_wheel_stop,
            **(coordinator_options or {}),
        )

    def process_legacy(payload):
        server.verify(payload)
        command = server.create_command(payload)
        if command.wheel_action is not None:
            twist = geometry_msgs.msg.Twist()
            twist.linear.x = float(command.wheel_action.linear_x)
            twist.angular.z = float(command.wheel_action.angular_z)
            wheel_pub.publish(twist)
        for action, publisher, message_type in (
            (command.front_arm_action, front_arm_pub, std_msgs.msg.Float64),
            (command.back_arm_action, back_arm_pub, std_msgs.msg.Float64),
            (command.front_drum_action, front_drum_pub, std_msgs.msg.Float64),
            (command.back_drum_action, back_drum_pub, std_msgs.msg.Float64),
            (command.routine_action, routine_pub, std_msgs.msg.Int8),
        ):
            if action is not None:
                message = message_type()
                message.data = action.value
                publisher.publish(message)

    app = flask.Flask(__name__)

    @app.route('/', methods=['GET'])
    def health():
        return {'Status': 200}

    @app.route('/', methods=['POST'])
    def handle_request():
        payload = flask.request.get_json(silent=True)
        if not isinstance(payload, dict) or not payload:
            return {'status': 400, 'error': 'Expected a nonempty JSON object.'}, 400
        if is_arm_request(payload):
            if coordinator is None:
                return {'status': 503, 'error': 'New arm interface disabled.'}, 503
            try:
                result = coordinator.command(payload)
            except ArmInputError as error:
                return {'status': 400, 'error': str(error)}, 400
            except ArmRateLimitError as error:
                return {'status': 429, 'error': str(error)}, 429
            except ArmInterlockError as error:
                return {'status': 423, 'error': str(error)}, 423
            except Exception as error:
                node.get_logger().error('Arm ROS publication failure: ' + str(error))
                return {'status': 503, 'error': 'Arm ROS publication failed.'}, 503
            return {'status': 200, **result}
        # A global ESTOP blocks all legacy driving and original actuator motion too.
        # Even a valid wheel movement must not bypass the arm safety latch.
        if coordinator is not None and coordinator.status()['latched']:
            return {'status': 423, 'error': 'ESTOP/watchdog latched. Motion disabled.'}, 423
        try:
            process_legacy(payload)
        except (server.VerificationError, TypeError, ValueError, KeyError) as error:
            node.get_logger().error(str(error))
            return {'status': 400, 'error': str(error)}, 400
        return {'status': 200}

    @app.route('/arm/estop', methods=['POST'])
    def arm_estop():
        if coordinator is None:
            return {'status': 503, 'error': 'New arm interface disabled.'}, 503
        try:
            result = coordinator.emergency_stop()
        except Exception as error:
            node.get_logger().error('ESTOP ROS publication failure: ' + str(error))
            return {'status': 503, 'error': 'ESTOP publication incomplete.'}, 503
        return {'status': 200, **result}

    @app.route('/arm/status', methods=['GET'])
    def arm_status():
        if coordinator is None:
            return {'enabled': False}
        return {'enabled': True, **coordinator.status()}

    app.arm_coordinator = coordinator
    return app


def main(passed_args=None):
    """Run the staged server; defaults prevent remote/network actuation."""
    rclpy.init(args=passed_args)
    node = rclpy.create_node(NODE)
    app = create_app(
        node,
        enable_arm=os.environ.get('RR_ENABLE_ARM') == '1',
    )
    try:
        app.run(host=os.environ.get('RR_HTTP_HOST', '127.0.0.1'),
                port=int(os.environ.get('RR_HTTP_PORT', '5001')),
                use_reloader=False)
    finally:
        if app.arm_coordinator is not None:
            app.arm_coordinator.close()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
