"""Optional ROS 2 BLDC subscriber, never touches the rover's wheel serial port.

DO NOT run against physical hardware without permission, correct serial identity,
limit checks, and separate firmware watchdog verification.
"""

import os
from byte_serial import BLDC_ALLOWED, SerialByteWriter


def main():
    if os.environ.get('RR_ALLOW_HARDWARE') != 'YES_I_HAVE_SECURED_ROVER':
        raise SystemExit('Hardware access disabled. Use the isolated ROS test runner instead.')
    device = os.environ.get('RR_BLDC_SERIAL_DEVICE', '')
    rover_namespace = os.environ.get('RR_ROVER_NAMESPACE', '')
    if not device.startswith('/dev/serial/by-id/') or not rover_namespace.startswith('ip_'):
        raise SystemExit('Set RR_BLDC_SERIAL_DEVICE to /dev/serial/by-id/... and RR_ROVER_NAMESPACE to ip_...')

    import rclpy
    import serial
    from rclpy.node import Node
    from std_msgs.msg import UInt8

    class BldcForwarder(Node):
        def __init__(self, serial_port):
            super().__init__('re_rassor_bldc_forwarder')
            self.writer = SerialByteWriter(serial_port, BLDC_ALLOWED)
            self.subscription = self.create_subscription(
                UInt8, '/' + rover_namespace + '/bldc_command_byte', self.receive, 10)

        def receive(self, msg):
            try:
                self.writer.write(msg.data)
            except (OSError, ValueError) as error:
                self.get_logger().error(f'BLDC serial failure: {error}')

    rclpy.init()
    port = None
    node = None
    try:
        port = serial.Serial(device, 115200, timeout=0.1, write_timeout=0.1)
        node = BldcForwarder(port)
        rclpy.spin(node)
    finally:
        if node is not None:
            node.destroy_node()
        if port is not None:
            port.close()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
