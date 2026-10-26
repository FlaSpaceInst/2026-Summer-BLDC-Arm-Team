"""Allowlisted one-byte serial protocol shared by staged ROS 2 forwarders."""

BLDC_ALLOWED = frozenset((0x09, 0x0A, 0x0B, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x18))
BASE_ALLOWED = frozenset((0x0C, 0x0D, 0x0E))


class SerialByteWriter:
    """Validate destination ownership and require a complete one-byte write."""

    def __init__(self, serial_port, allowlist):
        self.serial_port = serial_port
        self.allowlist = frozenset(allowlist)

    def write(self, byte):
        if type(byte) is not int or byte not in self.allowlist:
            raise ValueError('Unsupported serial byte for this Arduino.')
        if not self.serial_port.is_open:
            raise ConnectionError('Serial port not open.')
        written = self.serial_port.write(bytes((byte,)))
        if written != 1:
            raise IOError('Serial byte was not completely written.')
        return byte
