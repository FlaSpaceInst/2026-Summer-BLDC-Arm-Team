
"""
This node listens for HTTP messages over the wire that can be translated into
commands for the EZRASSOR. The translated commands are published to ROS topics
that the EZRASSOR understands.
"""
import ezrassor_controller_server as server
import geometry_msgs.msg
import rclpy
import std_msgs.msg
import sys
from flask import Flask, request, Response, stream_with_context, render_template, jsonify
from flask_cors import CORS # Import CORS
import cv2
from ezcamera import cameraController
import time
from cv_bridge import CvBridge, CvBridgeError
from sensor_msgs.msg import Image
import socket
import json

from rclpy.node import Node
from std_msgs.msg import String  # Replace with the correct message type

#the topics have to have /{rover_name}/ and match instructions in sim_description
NODE = "controller_server"
AUTONOMY_TOPIC = "/ezrassor/autonomy_instructions"
FRONT_ARM_ACTIONS_TOPIC = "/ezrassor/front_arm_instructions"
BACK_ARM_ACTIONS_TOPIC = "/ezrassor/back_arm_instructions"
ROUTINE_ACTIONS_TOPIC = "/ezrassor/routine_actions"
COMMAND_STATUS_TOPIC = f'/ezrassor/command_status'
IMAGE_RAW_TOPIC = "/usb_cam/image_raw"
QUEUE_SIZE = 11

FPS = 30.0
DISPLAY_FPS = 10.0
DISPLAY_IMG = True

def get_ip_address():
    try:
        # Create a dummy socket connection to get the IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to a public IP address (Google's DNS), but we don't actually send any data
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
        formatted_ip =  "ip_" + ip_address.replace(".", "_")
        return formatted_ip
    except Exception as e:
        print(f"Error finding IP for potato: {e}")
        return None  # Return None or a default value

class CommandStatusSubscriber(Node):
    def __init__(self):
        super().__init__('command_status_subscriber')
        ROVER_NAME = get_ip_address() or "ip_unknown"
        COMMAND_STATUS_TOPIC = f'/{ROVER_NAME}/command_status'
        # COMMAND_STATUS_TOPIC = '/ip_10_0_0_6/command_status'

        self.subscription = self.create_subscription(
            String,
            COMMAND_STATUS_TOPIC,
            self.command_status_callback,
            10
        )
        self.command_status = None
        self.command_count = 0  # Track the number of commands received

    def command_status_callback(self, msg):
        self.command_count += 1  # Increment command number
        self.command_status = f"{msg.data}{self.command_count}"  # Append the number to the status
        self.get_logger().info(f"Received command status: {self.command_status}")

    def get_last_status(self):
        return self.command_status

# ROVER_NAME = get_ip_address() or "ip_unknown"  # Unique rover name for each instance
ROVER_NAME = "ezrassor"
WHEEL_ACTIONS_TOPIC = f"/{ROVER_NAME}/wheel_instructions" # move other topics later
SHOULDER_ACTIONS_TOPIC = f"/{ROVER_NAME}/shoulder_instructions" # move other topics later
FRONT_DRUM_ACTIONS_TOPIC = f"/{ROVER_NAME}/front_drum_instructions"
BACK_DRUM_ACTIONS_TOPIC = f"/{ROVER_NAME}/back_drum_instructions"

def main(passed_args=None):
    print(sys.path)
    """Main entry point for the ROS node."""
    try:
        cameraController.initialize()
        rclpy.init(args=passed_args)
        node = rclpy.create_node(NODE)

        paver_arm_publisher = node.create_publisher(
            std_msgs.msg.String, '/ezrassor/paver_arm_json', QUEUE_SIZE
        )
        # Only wheel, autonomy and shoulder publishers are working atm
        # Create publishers for wheel actions -- sends twist commands
        wheel_actions_publisher = node.create_publisher(
            geometry_msgs.msg.Twist,
            WHEEL_ACTIONS_TOPIC,
            QUEUE_SIZE,
        )
        # Create a publisher for the autonomy functions -- sends twist commands -- should be changed to only sending x and y
        autonomy_publisher = node.create_publisher(
            geometry_msgs.msg.Twist,
            AUTONOMY_TOPIC,
            QUEUE_SIZE,
        )
        # Shoulder publisher -- sends twist commands
        shoulder_actions_publisher = node.create_publisher(
            geometry_msgs.msg.Twist,
            SHOULDER_ACTIONS_TOPIC,
            QUEUE_SIZE,
        )
        front_drum_actions_publisher = node.create_publisher(
            geometry_msgs.msg.Twist,
            FRONT_DRUM_ACTIONS_TOPIC,
            QUEUE_SIZE,
        )
        back_drum_actions_publisher = node.create_publisher(
            geometry_msgs.msg.Twist,
            BACK_DRUM_ACTIONS_TOPIC,
            QUEUE_SIZE,
        )
        # From here below the logic is not implemented yet
        front_arm_actions_publisher = node.create_publisher(
            std_msgs.msg.Float64,
            FRONT_ARM_ACTIONS_TOPIC,
            QUEUE_SIZE,
        )
        back_arm_actions_publisher = node.create_publisher(
            std_msgs.msg.Float64,
            BACK_ARM_ACTIONS_TOPIC,
            QUEUE_SIZE,
        )
        routine_actions_publisher = node.create_publisher(
            std_msgs.msg.Int8,
            ROUTINE_ACTIONS_TOPIC,
            QUEUE_SIZE,
        )
        img_publisher = node.create_publisher(
            Image,
            IMAGE_RAW_TOPIC,
            QUEUE_SIZE,
        )
        # End of unimplemented logic

        def process_request(request):
            """Callback to create and publish a command from a request."""
            server.verify(request)
            command = server.create_command(request)
            if command.wheel_action is not None:
                wheel_action = geometry_msgs.msg.Twist()
                # Converting linear x and angular z to floats since i am recieving as a string from controller code
                wheel_action.linear.x = float(command.wheel_action.linear_x)
                wheel_action.angular.z = float(command.wheel_action.angular_z)
                wheel_actions_publisher.publish(wheel_action)
            # autonomy code to recieve from controller and send to forwarder
            if command.target_coordinate is not None:
                target_coordinate = geometry_msgs.msg.Twist()
                # sending the autonomy coordinates as floats
                target_coordinate.linear.x = float(command.target_coordinate.x)
                target_coordinate.linear.y = float(command.target_coordinate.y)
                autonomy_publisher.publish(target_coordinate)
            # Shoulder code to recieve and send actions to the shoulders
            if command.shoulder_action is not None:
                shoulder_action = geometry_msgs.msg.Twist()
                # converting linear and angular y  to floats since I am sending it as a string
                shoulder_action.linear.y = float(command.shoulder_action.linear_y)
                shoulder_action.angular.y = float(command.shoulder_action.angular_y)
                shoulder_action.linear.x = float(command.shoulder_action.linear_x)
                shoulder_action.angular.z = float(command.shoulder_action.angular_z)
                shoulder_actions_publisher.publish(shoulder_action)
            if command.front_drum_action is not None:
                front_drum_action = geometry_msgs.msg.Twist()
                front_drum_action.linear.x = float(command.front_drum_action.linear_x)
                front_drum_actions_publisher.publish(front_drum_action)
            if command.back_drum_action is not None:
                back_drum_action = geometry_msgs.msg.Twist()
                back_drum_action.linear.x = float(command.back_drum_action.linear_x)
                back_drum_actions_publisher.publish(back_drum_action)

            # Not fully implemented
            if command.front_arm_action is not None:
                front_arm_action = std_msgs.msg.Float64()
                front_arm_action.data = command.front_arm_action.value
                front_arm_actions_publisher.publish(front_arm_action)
            # Not fully implemented
            if command.back_arm_action is not None:
                back_arm_action = std_msgs.msg.Float64()
                back_arm_action.data = command.back_arm_action.value
                back_arm_actions_publisher.publish(back_arm_action)
            # Not fully implemented
            if command.routine_action is not None:
                routine_action = std_msgs.msg.Int8()
                routine_action.data = command.routine_action.value
                routine_actions_publisher.publish(routine_action)

        def process_detection_request(request):
            detection_status = None
            if "detectionStatus" in request:
                detection_status = request["detectionStatus"]
                cameraController.toggle_detection(detection_status)

        # Create a Flask app to serve HTTP requests.
        app = Flask(__name__)
        CORS(app)

        # Create the ROS2 node for status subscription
        statusNode = CommandStatusSubscriber()

        formatted_ip = get_ip_address()
        if formatted_ip:
            # Dynamically define the route with the formatted IP address
            @app.route(f'/{formatted_ip}/command_status', methods=['GET'])
            def get_command_status():
                if statusNode:
                    status = statusNode.get_last_status()
                    if status:
                        return jsonify({'status': status}), 200
                    else:
                        return jsonify({'error': 'No status received yet'}), 400
                else:
                    return jsonify({'error': 'ROS2 node is not initialized'}), 500




        @app.route("/", methods=["OPTIONS"])
        def handle_options():
            return {'status': 200}

        # Default get request
        @app.route("/", methods=["GET"])
        def default_get():
            return {"status": 200}

        @app.route("/", methods=["POST"])
        def handle_request():
            try:
                payload = request.get_json(silent=True)
                if payload is None:
                    return {"status": 400, "error": "Invalid JSON body"}

                arm_fields = {'plate_joint_action', 'shoulder_joint_action', 'forearm_joint_action'}
                if arm_fields.intersection(payload):
                    for key in arm_fields.intersection(payload):
                        if payload[key] not in ('POSITIVE', 'NEGATIVE', 'STOP'):
                            return {"status": 400, "error": f"Invalid {key}"}, 400
                    arm_msg = std_msgs.msg.String()
                    arm_msg.data = json.dumps({k: payload[k] for k in arm_fields if k in payload})
                    paver_arm_publisher.publish(arm_msg)
                    node.get_logger().info(f"PAVER ARM PUBLISHED: {arm_msg.data}")
                    payload = {k: v for k, v in payload.items() if k not in arm_fields}
                    if not payload:
                        return {"status": 200}

                process_request(payload)
                return {"status": 200}
            except server.VerificationError as error:
                node.get_logger().error(str(error))

                return {"status": 400}
            except Exception as error:
                node.get_logger().error(f"Unexpected request error: {error}")
                return {"status": 500}

        @app.after_request
        def apply_cors_headers(response):
            response.headers["Access-Control-Allow-Origin"]="*"
            response.headers["Access-Control-Allow-Methods"]="GET,POST,OPTIONS"
            response.headers["Access-Control-Allow-Headers"]="Content-Type,Authorization"
            return response

        @app.route('/video_feed')
        def video_feed():
            """Stream video to webpage on local network"""
            return Response(stream_with_context(cameraController.generate_stream()), mimetype="multipart/x-mixed-replace; boundary=frame")

        @app.route('/is_detection')
        def is_detection():
            """Updates if a paver has been detected and if so where it is"""
            return Response(cameraController.getDetectionReport(), mimetype="text/plain")

        # Run the Flask app in a separate thread or process so ROS can spin
        from threading import Thread
        def run_flask():
            app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)

        flask_thread = Thread(target=run_flask)
        flask_thread.start()

        # Spin the ROS node for status updates
        try:
            rclpy.spin(statusNode)
        except KeyboardInterrupt:
            pass
        finally:
            statusNode.destroy_node()
            rclpy.shutdown()

    except KeyboardInterrupt:
        pass

