ezrassor_controller_server
---------------------
![Build Badge](https://github.com/FlaSpaceInst/ezrassor_controller_server/workflows/Build/badge.svg) ![Style Badge](https://img.shields.io/badge/Code%20Style-black-000000.svg)

The `ezrassor_controller_server` listens for HTTP POST requests and translates those requests into commands for the EZRASSOR. These commands are made up of different actions that control various aspects of the robot. Actions are ultimately published on individual action topics.

The controller server is one of several optional controller packages available for the EZRASSOR.

topics
------
```
controller_server -> /wheel_actions
controller_server -> /front_arm_actions
controller_server -> /back_arm_actions
controller_server -> /front_drum_actions
controller_server -> /back_drum_actions
controller_server -> /routine_actions
```

usage
-----
```
command:
  ros2 launch ezrassor_controller_server controller_server.py
```

examples
--------
Launch a controller server on port 5000:
```
ros2 launch ezrassor_controller_server controller_server.py
```
