#!/usr/bin/env python3
"""ROS 2 serial subscriber for RE-RASSOR Wheels, Arm, and Hand boards.

Use --wheel-port only after confirming this process is the sole owner of the
wheels serial device. Leaving it unset allows migration in two stages.
"""

import argparse
import json
import os
import threading
import time

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from std_msgs.msg import String
import serial

from .ros_motor_protocol import (
    ARM_TOPIC,
    DRIVER_STATUS_TOPIC,
    decodeArmPayload,
    encodeWheel,
    encodeSpeed,
    wheelDirection,
    wheelSpeedFromTwist,
)


class RassorDriverSubscriber(Node):
    def __init__(self, armPort, handPort, wheelPort=None,
                 enableBase=False, roverName=None, serialFactory=None, bootDelaySeconds=2.0):
        super().__init__('rassor_driver_subscriber')
        self.serialFactory = serialFactory
        if self.serialFactory is None:
            self.serialFactory = serial.Serial

        portNames = {'arm': armPort, 'hand': handPort}
        if wheelPort is not None:
            portNames['wheels'] = wheelPort
        canonicalPaths = [os.path.realpath(path) for path in portNames.values()]
        if len(canonicalPaths) != len(set(canonicalPaths)):
            raise ValueError('Every Arduino must use its own USB serial device')
        if enableBase and wheelPort is None:
            raise ValueError('Base requires a Wheels Arduino serial connection')

        if bootDelaySeconds < 0:
            raise ValueError('Boot delay cannot be negative')
        self.readyAt = time.monotonic() + bootDelaySeconds
        self.enableBase = enableBase
        self.ports = {}
        self.portLocks = {}
        self.portHealthy = {}
        self.rosSubscriptions = []
        self.lastCommands = {}
        # Always initialize the desired wheel speed on first movement.
        self.wheelSpeedLevel = None
        self.currentWheelDirection = 'STOP'
        try:
            for name, path in portNames.items():
                # On Linux, exclusive mode helps prevent competing serial owners.
                self.ports[name] = self.serialFactory(path, 115200, write_timeout=0.5, exclusive=True)
                self.portLocks[name] = threading.Lock()
                self.portHealthy[name] = True
        except Exception:
            self.closePorts()
            raise

        self.statusPublisher = self.create_publisher(String, DRIVER_STATUS_TOPIC, 10)
        self.statusTimer = self.create_timer(0.5, self.publishStatus)

        if wheelPort is not None:
            wheelTopics = ['/ezrassor/wheel_instructions']
            if roverName:
                namedTopic = f'/{roverName}/wheel_instructions'
                if namedTopic not in wheelTopics:
                    wheelTopics.append(namedTopic)
            for topic in wheelTopics:
                self.rosSubscriptions.append(self.create_subscription(Twist, topic, self.onWheel, 10))
                self.get_logger().info(f'Wheel subscriber: {topic}')

        self.rosSubscriptions.append(self.create_subscription(String, ARM_TOPIC, self.onArmJson, 10))
        self.get_logger().info(f'Arm + hand subscriber: {ARM_TOPIC}')
        self.get_logger().info('Each serial device is owned by one process')
        self.publishStatus()

    def publishStatus(self):
        status = {}
        for name in ('wheels', 'arm', 'hand'):
            port = self.ports.get(name)
            isOpen = False
            if port is not None:
                isOpen = bool(port.is_open) and self.portHealthy.get(name, False)
                if time.monotonic() < self.readyAt:
                    isOpen = False
            status[name + 'Open'] = isOpen
        status['baseEnabled'] = self.enableBase
        status['serialProtocol'] = 'binary'
        message = String()
        message.data = json.dumps(status)
        self.statusPublisher.publish(message)

    def send(self, target, frame, description):
        port = self.ports.get(target)
        if time.monotonic() < self.readyAt:
            self.get_logger().error(f'{target} still booting; ignoring {description}')
            return False
        if port is None or not self.portHealthy.get(target, False) or not port.is_open:
            self.get_logger().error(f'{target} unavailable for {description}')
            return False
        try:
            with self.portLocks[target]:
                length = port.write(frame)
                if length != len(frame):
                    raise serial.SerialTimeoutException('Incomplete serial write')
            self.lastCommands[target] = frame
            self.get_logger().debug(f'{target} TX {description}: {frame!r}')
            return True
        except (serial.SerialException, OSError) as error:
            self.portHealthy[target] = False
            self.get_logger().error(f'{target} serial error: {error}')
            self.publishStatus()
            return False

    def onWheel(self, msg):
        try:
            speedLevel = wheelSpeedFromTwist(msg.linear.x, msg.angular.z)
        except (ValueError, TypeError) as error:
            self.get_logger().error(f'Invalid wheel speed: {error}')
            return
        direction = wheelDirection(msg.linear.x, msg.angular.z)
        if direction == 'STOP':
            if self.send('wheels', encodeWheel('STOP'), 'STOP'):
                self.currentWheelDirection = 'STOP'
                self.wheelSpeedLevel = None
            return

        if self.currentWheelDirection not in ('STOP', direction):
            # Transmit STOP first. Firmware decelerates asynchronously, so a
            # rapid new direction command still requires a hardware interlock.
            if not self.send('wheels', encodeWheel('STOP'), 'direction change STOP'):
                return
            self.currentWheelDirection = 'STOP'
            self.wheelSpeedLevel = None

        if speedLevel != self.wheelSpeedLevel:
            if not self.send('wheels', encodeSpeed('wheels', speedLevel), 'wheel speed'):
                return
            self.wheelSpeedLevel = speedLevel

        # Repeated taps in the same direction only need the speed byte.
        # Repeating FWD/REV/LEFT/RIGHT here would restart acceleration.
        if direction != self.currentWheelDirection:
            if self.send('wheels', encodeWheel(direction), direction):
                self.currentWheelDirection = direction

    def onArmJson(self, msg):
        try:
            payload = json.loads(msg.data)
            commands = decodeArmPayload(payload, enableBase=self.enableBase)
        except (ValueError, TypeError) as error:
            self.get_logger().error(f'Invalid arm JSON: {error}')
            return
        for target, byte, field in commands:
            self.send(target, bytes([byte]), field)

    def closePorts(self):
        # These are best-effort stops on orderly shutdown, not a link-loss failsafe.
        stopFrames = {'arm': b'\x17', 'hand': b'\x0b'}
        if 'wheels' in self.ports:
            stopFrames['wheels'] = encodeWheel('STOP')
        for name, port in list(self.ports.items()):
            try:
                if port.is_open:
                    with self.portLocks.get(name, threading.Lock()):
                        if name in stopFrames:
                            port.write(stopFrames[name])
                            port.flush()
                    port.close()
            except (serial.SerialException, OSError) as error:
                self.get_logger().error(f'Shutdown serial error on {name}: {error}')


def main():
    parser = argparse.ArgumentParser(description='RE-RASSOR ROS 2 three-Arduino subscriber')
    parser.add_argument('--arm-port', required=True)
    parser.add_argument('--hand-port', required=True)
    parser.add_argument('--wheel-port', default=None, help='Optional until ROS owns the wheels port')
    parser.add_argument('--enable-base', action='store_true', help='Only after hardware protocol validation')
    parser.add_argument('--rover-name', default=None)
    parser.add_argument('--boot-delay', default=2.0, type=float, help='Arduino USB reset settling time, seconds')
    args = parser.parse_args()

    rclpy.init()
    node = None
    try:
        node = RassorDriverSubscriber(
            armPort=args.arm_port,
            handPort=args.hand_port,
            wheelPort=args.wheel_port,
            enableBase=args.enable_base,
            roverName=args.rover_name,
            bootDelaySeconds=args.boot_delay,
        )
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if node is not None:
            node.closePorts()
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == '__main__':
    main()
