# EZ-RASSOR arm command bridge

This small Node.js service receives the controller's arm JSON over **HTTP** and writes the matching one-byte command to the Arduino serial connection. It supports the three motors in the current arm: shoulder, elbow, and end effector.

## Command mapping

| Controller field | `POSITIVE` | `NEGATIVE` | `STOP` |
| --- | --- | --- | --- |
| `shoulder_joint_action` | `0x0F` forward | `0x10` reverse | `0x11` stop |
| `forearm_joint_action` (elbow) | `0x12` forward | `0x13` reverse | `0x14` stop |
| `end_effector_action` | `0x09` open | `0x0A` close | `0x0B` stop |

The byte values match `COMMANDS` in `../arduino_wheels.ino`.

## Run on the computer physically connected to the Arduino

Install the bridge dependencies once:

```bash
npm install
```

Start it with the Arduino serial port. Use `COM3` on Windows or a path such as `/dev/ttyACM0` on Linux:

```bash
# Windows Command Prompt
set SERIAL_PORT=COM3 && npm start

# Linux
SERIAL_PORT=/dev/ttyACM0 npm start
```

It listens on port `3000` by default. In the mobile controller's IP field, enter the bridge host and port, for example `192.168.1.50:3000`.

Verify it before moving hardware:

```bash
curl http://127.0.0.1:3000/health
```

## Safety

The bridge only maps the three documented arm fields and rejects unknown action values. Test with the arm supported/clear of people and use the app's stop button before testing each direction. The `POSITIVE` / `NEGATIVE` direction names are logical names; reverse the Arduino direction constants if a motor moves opposite to the desired physical direction.
