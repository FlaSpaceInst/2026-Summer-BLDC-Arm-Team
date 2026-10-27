
#!/usr/bin/env python3
# Copyright 2016 Open Source Robotics Foundation, Inc.
# Modifications Copyright (c) 2022 Florida Space Institute (MIT License).
# TODO: HAND + BASE
import argparse
import json
import threading
import time

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from std_msgs.msg import String
import serial

ARM_BYTES = {
    'shoulder_joint_action': {'POSITIVE': 0x0F, 'NEGATIVE': 0x10, 'STOP': 0x11},
    'forearm_joint_action': {'POSITIVE': 0x12, 'NEGATIVE': 0x13, 'STOP': 0x14},
}


class RassorDriverSubscriber(Node):
    def __init__(self, wheel_port, arm_port, rover_name=None):
        super().__init__('rassor_driver_subscriber')
        self.wheel_usb = serial.Serial(wheel_port, 115200, write_timeout=0.5)
        try:
            self.arm_usb = serial.Serial(arm_port, 115200, write_timeout=0.5)
        except Exception:
            self.wheel_usb.close()
            raise
        self.wheel_lock = threading.Lock()
        self.arm_lock = threading.Lock()
        self.last_arm = {}
        self.arm_bridge_subscriptions = []
        wheel_topics = ['/ezrassor/wheel_instructions']
        if rover_name:
            wheel_topics.append(f'/{rover_name}/wheel_instructions')
        for topic in wheel_topics:
            self.arm_bridge_subscriptions.append(self.create_subscription(Twist, topic, self.on_wheel, 100))
            self.get_logger().info(f'WHEEL subscriber: {topic}')
        self.arm_bridge_subscriptions.append(self.create_subscription(Twist, '/ezrassor/shoulder_instructions', self.on_legacy_shoulder, 100))
        self.get_logger().info('LEGACY BASE subscriber: /ezrassor/shoulder_instructions')
        if rover_name:
            self.arm_bridge_subscriptions.append(self.create_subscription(Twist, f'/{rover_name}/shoulder_instructions', self.on_legacy_shoulder, 100))
        self.arm_bridge_subscriptions.append(self.create_subscription(String, '/ezrassor/paver_arm_json', self.on_arm_json, 100))
        self.get_logger().info('ARM subscriber: /ezrassor/paver_arm_json (std_msgs/String)')
        self.get_logger().info(f'Wheel USB={wheel_port}; arm USB={arm_port}; baud=115200')
        # Allow Arduino Mega to reset on serial open; no commands sent until messages arrive.

    def send_wheel(self, byte):
        try:
            with self.wheel_lock:
                self.wheel_usb.write(bytes([byte]))
            self.get_logger().info(f'WHEEL TX 0x{byte:02X}')
        except serial.SerialException as exc:
            self.get_logger().error(f'WHEEL SERIAL ERROR: {exc}')

    def send_arm(self, byte, field):
        try:
            with self.arm_lock:
                self.arm_usb.write(bytes([byte]))
            self.get_logger().info(f'ARM TX {field}: 0x{byte:02X}')
            self.last_arm[field] = byte
        except serial.SerialException as exc:
            self.get_logger().error(f'ARM SERIAL ERROR: {exc}')

    def on_wheel(self, msg):
        x, z = msg.linear.x, msg.angular.z
        if x == 0 and z == 0:
            command = 0x00
        elif x > 0:
            command = 0x01
        elif x < 0:
            command = 0x02
        elif z > 0:
            command = 0x03
        else:
            command = 0x04
        self.send_wheel(command)

    def on_legacy_shoulder(self, msg):
        y, a = msg.linear.y, msg.angular.y
        if y == 0 and a == 0:
            command = 0x00
        elif y > 0:
            command = 0x05
        elif y < 0:
            command = 0x06
        elif a > 0:
            command = 0x07
        else:
            command = 0x08
        self.get_logger().info(f'LEGACY BASE RX linear.y={y}, angular.y={a}')
        self.send_wheel(command)

    def on_arm_json(self, msg):
        self.get_logger().info(f'ARM RX {msg.data}')
        try:
            payload = json.loads(msg.data)
            if not isinstance(payload, dict):
                raise ValueError('expected JSON object')
            for field, mapping in ARM_BYTES.items():
                if field not in payload:
                    continue
                action = payload[field]
                if action not in mapping:
                    raise ValueError(f'{field} invalid action: {action!r}')
                command = mapping[action]
                # Send each explicit request including STOP, rather than suppressing repeats.
                self.send_arm(command, field)
        except (ValueError, TypeError) as exc:
            self.get_logger().error(f'Invalid arm command: {exc}')

    def close_ports(self):
        # Stop shoulder and elbow on orderly shutdown, without touching wheel state.
        try:
            if self.arm_usb.is_open:
                with self.arm_lock:
                    self.arm_usb.write(bytes([0x17]))
                    self.arm_usb.flush()
                self.arm_usb.close()
        finally:
            if self.wheel_usb.is_open:
                self.wheel_usb.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--wheel-port', default='/dev/ttyACM0')
    parser.add_argument('--arm-port', default='/dev/ttyACM2')
    parser.add_argument('--rover-name', default=None, help='e.g. ip_192_168_10_3; subscribes to its wheel topic too')
    args = parser.parse_args()
    if args.wheel_port == args.arm_port:
        parser.error('Wheel and arm serial ports must be different')
    rclpy.init()
    node = None
    try:
        node = RassorDriverSubscriber(args.wheel_port, args.arm_port, args.rover_name)
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if node is not None:
            node.close_ports()
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == '__main__':
    main()

