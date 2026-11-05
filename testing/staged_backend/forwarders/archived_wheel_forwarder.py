# Copyright 2016 Open Source Robotics Foundation, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Modifications Copyright (c) 2022 Florida Space Institute
#     - Renamed the simple subscriber to RassorDriverSubscruber to subscribe
#       to 'ezrassor/wheel_instructions' instead of 'topic'
#     - Created the PySerial code for serial variable 'usb', and properly
#       opened and terminated it in the init function and main function
#     - Modified the callback function to support the change
#     - Created functions "bin_command_format" and "bin_command_send"
# Modified code is under the MIT License
#
#
#
# MIT License
#
# Copyright (c) 2022 Florida Space Institute

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import rclpy
from rclpy.node import Node
import os
import socket

from std_msgs.msg import String
from geometry_msgs.msg import Twist

import serial

class RassorDriverSubscriber(Node):
    usb1 = serial.Serial()
    usb1.baudrate = 115200
    usb1.port = "/dev/arduino_wheel"
    usb1.write_timeout = 0.1
    usb2 = None

    def get_ip_address(self):
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
            self.get_logger().error(f"Error finding IP for potato: {e}")
            return None  # Return None or a default value

    def __init__(self):
        RassorDriverSubscriber.usb1.open() # opens the serial connection

        if os.path.exists("/dev/arduino_drum"):
            RassorDriverSubscriber.usb2 = serial.Serial()
            RassorDriverSubscriber.usb2.baudrate = 115200
            RassorDriverSubscriber.usb2.port = "/dev/arduino_drum"
            RassorDriverSubscriber.usb2.write_timeout = 0.1
            RassorDriverSubscriber.usb2.open()

        super().__init__('rassor_driver_subscriber')
        self.get_logger().info("Starting the RE-RASSOR Serial forwarding service.")

        if os.path.exists("/dev/arduino_drum"):
            self.get_logger().info("Arduino Drum is Connected")

        ROVER_NAME = self.get_ip_address() or "ip_unknown"

        STATUS_TOPIC = f'/{ROVER_NAME}/command_status'
        self.status_publisher = self.create_publisher(String, STATUS_TOPIC, 10)
        self.get_logger().info(f"Status topic initialized: {STATUS_TOPIC}")

        # Publish an initial message to create the topic
        status_msg = String()
        status_msg.data = "Node started"
        self.status_publisher.publish(status_msg)
        self.get_logger().info(f"Published initial status message")



        WHEEL_ACTIONS_TOPIC = f'/{ROVER_NAME}/wheel_instructions'
        self.subscription = self.create_subscription(
            Twist,
            WHEEL_ACTIONS_TOPIC,
            self.listener_callback,
            100)
        self.subscription  # prevent unused variable warning
        SHOULDER_ACTIONS_TOPIC = f'/{ROVER_NAME}/shoulder_instructions'
        self.subscription2 = self.create_subscription(
            Twist,
            SHOULDER_ACTIONS_TOPIC,
            self.listener_callback2,
            100)
        self.subscription2  # prevent unused variable warning
        FRONT_DRUM_ACTIONS_TOPIC = f'/{ROVER_NAME}/front_drum_instructions'
        self.subscription3 = self.create_subscription(
            Twist,
            FRONT_DRUM_ACTIONS_TOPIC,
            self.listener_callback3,
            100)
        self.subscription3  # prevent unused variable warning

    def publish_status(self, message):
        self.get_logger().info('Publishing the status of the last command...')
        status_msg = String()
        status_msg.data = message
        self.status_publisher.publish(status_msg)
        self.get_logger().info(f"Published: '{message}'")

    def listener_callback(self, msg):
        if not os.path.exists("/dev/arduino_wheel"):
            self.publish_status("Missing Arduino for Wheels...")
            return
        self.get_logger().info('linear.x: %f' % msg.linear.x)
        self.get_logger().info('angular.z: %f' % msg.angular.z)
        lin_x = msg.linear.x
        ang_z = msg.angular.z
        packet = self.bin_command_format(lin_x, ang_z)
        self.bin_command_send(packet, RassorDriverSubscriber.usb1)  # Send wheel packet to usb1

    def listener_callback2(self, msg):
        if not os.path.exists("/dev/arduino_drum"):
            self.publish_status("Missing Arduino for Drums...")
            return
        self.get_logger().info('linear.y: %f' % msg.linear.y)
        self.get_logger().info('angular.y: %f' % msg.angular.y)
        lin_y = msg.linear.y
        ang_y = msg.angular.y
        packet = self.bin_command_format_shoulder(lin_y, ang_y)
        self.bin_command_send(packet, RassorDriverSubscriber.usb2)  # Send shoulder packet to usb2

    def listener_callback3(self, msg):
        if not os.path.exists("/dev/arduino_drum"):
            self.publish_status("Missing Arduino for Drums...")
            return
        self.get_logger().info('linear.x: %f' % msg.linear.x)
        lin_x = msg.linear.x
        packet = self.bin_command_format_drum(lin_x)
        self.bin_command_send(packet, RassorDriverSubscriber.usb2)  # Send drum packet to usb2

    def bin_command_format(self, lin_x, ang_z):
        packet = bytearray()
        if lin_x == 0.0 and ang_z == 0.0:
            packet.append(0x00) # coast
        elif lin_x > 0:
            packet.append(0x01) # forwards
        elif lin_x < 0:
            packet.append(0x02) # backwards
        elif ang_z > 0:
            packet.append(0x03) # left
        else:
            packet.append(0x04) # right
        return packet

    def bin_command_format_shoulder(self, lin_y, ang_y):
        packet = bytearray()
        if lin_y == 0.0 and ang_y == 0.0:
            packet.append(0x00) # Do nothing
        elif lin_y > 0:
            packet.append(0x05) # Raise Front
        elif lin_y < 0:
            packet.append(0x06) # Lower Front
        elif ang_y > 0:
            packet.append(0x07) # Raise Back
        else:
            packet.append(0x08) # Lower Back
        return packet

    def bin_command_format_drum(self, lin_x):
        packet = bytearray()
        if lin_x == 0.0:
            packet.append(0x00) # stop
        elif lin_x > 0:
            packet.append(0x01) # dump
        else:
            packet.append(0x02) # dig
        return packet

    def bin_command_send(self, packet, usb):
        try:
            self.get_logger().info("Sending packet: " + str(packet))
            usb.write(packet)
            self.publish_status("Success")  # If command sent successfully, publish success
        except serial.SerialTimeoutException as e:
            self.get_logger().error(f"Write timeout occurred: {e}")
            self.publish_status("Timeout")
            usb.flushInput()
            usb.flushOutput()
        except Exception as e:
            self.get_logger().error(f"Other exception occurred: {e}")
            self.publish_status("Exception")
            usb.flushInput()
            usb.flushOutput()

def main(args=None):
    rclpy.init(args=args)

    rassor_driver_subscriber = RassorDriverSubscriber()

    rclpy.spin(rassor_driver_subscriber)

    RassorDriverSubscriber.usb1.close()
    if RassorDriverSubscriber.usb2 is not None:
         RassorDriverSubscriber.usb2.close()
    rassor_driver_subscriber.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
