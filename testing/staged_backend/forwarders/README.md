# Staged serial forwarding

- `archived_wheel_forwarder.py` is the unmodified backup, for comparison only.
- `staged_wheel_base_forwarder.py` is a **replacement**, never a second concurrent wheel serial owner. It adds a subscription to `/<ip_namespace>/arm_base_command_byte` (`std_msgs/msg/UInt8`) to the original wheel process and writes base bytes 0x0C/0x0D/0x0E using its existing wheel serial connection.
- `bldc_forwarder.py` owns **only** the separately named BLDC Arduino serial device and subscribes to `/<ip_namespace>/bldc_command_byte`.
- `byte_serial.py` validates command bytes, open-port state, and the length of writes.

Neither forwarder is automatically installed, started, or configured as a service. Both script entry points require `RR_ALLOW_HARDWARE=YES_I_HAVE_SECURED_ROVER`; this is a procedural barrier, not a substitute for secure permissions or a hardware interlock.

**Critical dependency:** The **Pi-archived** wheel Arduino firmware recognizes only 0x00–0x04. A separate **2026 team candidate** sketch includes the base stepper bytes, but the flashed firmware and hardware response are unknown. Forwarding base bytes without compatible flashed firmware does **not** move the base. The provided reference sketch is unchanged, and no firmware is flashed.

ROS publish success and `Serial.write()` success do not prove a motor moved or stopped. A microcontroller-side timeout, motor limit protections, safe STOP semantics, and a real E-stop circuit must be validated independently.
