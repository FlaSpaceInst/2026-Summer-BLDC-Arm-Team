import roverFetch from '../../api/rover-fetch';
import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import EZARM from '../../api/ezrassor-service-paver-arm';
import { Robot, Operation } from '../../enumerations/robot-commands-paver-arm';
import { getRosControlHost } from '../../functionality/control-modes';
import { nextTapSpeed } from '../../functionality/tap-speed';
import SpeedDots from './SpeedDots';

/**
 * The existing arm commands in a compact panel beside the rover wheel controls.
 * Each tap starts movement or increases speed to Level 3 the red STOP
 * button or a mode change stops the current joint.
 */
export default class ArmControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rosHost: getRosControlHost(props.roverIp),
      rosReady: false,
      baseAvailable: false,
      statusMessage: 'CONNECTING TO ROS 2...',
      activeControl: '',
      armSpeed: 0
    };
    this.armService = new EZARM(this.state.rosHost);
    this.activePart = null;
    this.activeOperation = null;
    this.activeSpeedLevel = 0;
    this.componentMounted = false;
    this.rosCheckId = 0;
  }

  componentDidMount() {
    this.componentMounted = true;
    this.checkRos();
  }

  componentDidUpdate(previousProps) {
    if (previousProps.roverIp !== this.props.roverIp ||
        previousProps.offlineMode !== this.props.offlineMode) {
      this.stopMotion();
      this.rosCheckId += 1;
      const rosHost = getRosControlHost(this.props.roverIp);
      this.armService.host = rosHost;
      this.setState({
        rosHost,
        rosReady: false,
        baseAvailable: false,
        statusMessage: 'CHECKING ROS 2...'
      }, () => this.checkRos());
    }
  }

  componentWillUnmount() {
    this.componentMounted = false;
    this.rosCheckId += 1;
    this.stopMotion();
  }

  async checkRos() {
    // Do not disable an active movement button without first issuing STOP.
    if (this.activePart) {
      this.stopMotion();
    }
    const checkId = ++this.rosCheckId;
    if (this.props.offlineMode) {
      if (this.componentMounted) {
        this.setState({
          rosReady: false,
          baseAvailable: false,
          statusMessage: 'OFFLINE PREVIEW: commands disabled'
        });
      }
      return;
    }

    const rosHost = getRosControlHost(this.props.roverIp);
    if (!rosHost) {
      if (this.componentMounted) {
        this.setState({
          rosReady: false,
          baseAvailable: false,
          statusMessage: 'CONNECT TO THE ROVER FIRST'
        });
      }
      return;
    }

    // Arm and hand commands use only the rover ROS 2 address.
    this.setState({ rosReady: false, baseAvailable: false, rosHost, statusMessage: 'CHECKING ROS 2...' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      let url = rosHost;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      const response = await roverFetch(url.replace(/\/$/, '') + '/health', { signal: controller.signal });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      const status = await response.json();
      if (status.serialProtocol !== 'binary') {
        throw new Error('Expected ROS 2 binary serial driver status');
      }
      if (status.armOpen !== true || status.handOpen !== true || status.ready !== true) {
        throw new Error('Arm or hand Arduino not ready in ROS 2');
      }
      if (!this.componentMounted || checkId !== this.rosCheckId) {
        return;
      }

      this.armService.host = rosHost;
      this.setState({
        rosReady: true,
        baseAvailable: status.wheelsOpen === true && status.baseEnabled === true,
        statusMessage: 'ROS 2: ARM + HAND CONNECTED'
      });
    } catch (error) {
      if (this.componentMounted && checkId === this.rosCheckId) {
        this.setState({
          rosReady: false,
          baseAvailable: false,
          statusMessage: 'ROS UNAVAILABLE: ' + error.message
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendCommand(part, operation, speed = 1) {
    if (this.props.offlineMode) {
      return;
    }
    if (!this.state.rosReady && operation !== Operation.STOP) {
      return;
    }
    try {
      await this.armService.executeRobotCommand(part, operation, speed);
    } catch (error) {
      this.activePart = null;
      this.activeOperation = null;
      this.activeSpeedLevel = 0;
      this.armService.allStop().catch(() => {});
      if (this.componentMounted) {
        this.setState({ rosReady: false, activeControl: '', armSpeed: 0, statusMessage: 'ROS COMMAND FAILED: ' + error.message });
      }
    }
  }

  pressMotion(part, operation, label) {
    if (this.props.offlineMode || !this.state.rosReady) {
      return;
    }
    if (part === Robot.PLATE && !this.state.baseAvailable) {
      return;
    }

    const sameDirection = this.activePart === part && this.activeOperation === operation;
    let nextLevel = 1;
    if (sameDirection) {
      nextLevel = nextTapSpeed(this.activeOperation, operation, this.activeSpeedLevel);
      if (nextLevel === this.activeSpeedLevel && part !== Robot.ENDEFFECTOR) {
        return;
      }
    } else if (this.activePart) {
      this.sendCommand(this.activePart, Operation.STOP);
    }

    this.activePart = part;
    this.activeOperation = operation;
    this.activeSpeedLevel = nextLevel;
    this.setState({
      armSpeed: nextLevel,
      activeControl: label,
      statusMessage: 'ARM: ' + label + ' / LEVEL ' + nextLevel
    });

    if (sameDirection && part !== Robot.ENDEFFECTOR) {
      // Updating speed without repeating direction preserves stepper motion.
      this.armService.setSpeed(part, nextLevel).catch((error) => {
        this.emergencyStop();
        if (this.componentMounted) {
          this.setState({ rosReady: false, statusMessage: 'ROS SPEED COMMAND FAILED: ' + error.message });
        }
      });
    } else {
      // The gripper firmware executes a finite-duration pulse. Every tap must send movement again to start/extend a new pulse at that speed.
      this.sendCommand(part, operation, nextLevel);
    }
  }

  stopMotion() {
    const part = this.activePart;
    this.activePart = null;
    this.activeOperation = null;
    this.activeSpeedLevel = 0;
    if (this.componentMounted) {
      this.setState({ activeControl: '', armSpeed: 0, statusMessage: 'STOP REQUESTED' });
    }
    if (part) {
      this.sendCommand(part, Operation.STOP);
    }
  }

  emergencyStop() {
    this.activePart = null;
    this.activeOperation = null;
    this.activeSpeedLevel = 0;
    if (this.componentMounted) {
      this.setState({ activeControl: '', armSpeed: 0, statusMessage: 'ARM STOP REQUESTED' });
    }
    this.sendCommand(Robot.ALL, Operation.STOP);
  }

  renderJoint(label, part, positiveLabel, negativeLabel, positiveIcon, negativeIcon) {
    const disabled = this.props.offlineMode || !this.state.rosReady || (part === Robot.PLATE && !this.state.baseAvailable);
    return (
      <View style={{ marginBottom: 8 }} key={label}>
        <Text style={{ color: '#fff', textAlign: 'center', fontSize: 17, fontFamily: 'NASA', marginBottom: 4 }}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {this.renderDirection(part, Operation.POSITIVE, label + ' ' + positiveLabel, positiveLabel, positiveIcon, disabled)}
          {this.renderDirection(part, Operation.NEGATIVE, label + ' ' + negativeLabel, negativeLabel, negativeIcon, disabled)}
        </View>
      </View>
    );
  }

  renderDirection(part, operation, label, text, icon, disabled) {
    const isActive = this.state.activeControl === label;
    let backgroundColor = '#3a3d3d';
    if (isActive) {
      backgroundColor = '#526363';
    }
    let buttonOpacity = 1;
    if (disabled) {
      buttonOpacity = 0.5;
    }

    // Mirror the original D-pad lights within each joint's direction buttons.
    // Only the active direction illuminates; positive is green, negative red.
    let indicatorLevel = 0;
    let indicatorSide = 'right';
    if (operation === Operation.NEGATIVE) {
      indicatorSide = 'left';
    }
    if (this.activePart === part && this.activeOperation === operation) {
      indicatorLevel = this.state.armSpeed;
      if (operation === Operation.NEGATIVE) {
        indicatorLevel = -indicatorLevel;
      }
    }
    return (
      <TouchableOpacity
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => this.pressMotion(part, operation, label)}
        style={{ flex: 1, minHeight: 54, borderRadius: 9, backgroundColor, opacity: buttonOpacity, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 12 }}
      >
        <Text style={{ fontFamily: 'NASA', color: '#fff', fontSize: 15 }}>{text}</Text>
        <FontAwesome name={icon} size={24} color="#fff" />
        <SpeedDots
          level={indicatorLevel}
          side={indicatorSide}
          label={label + ' speed'}
        />
      </TouchableOpacity>
    );
  }

  render() {
    let statusText = this.state.statusMessage;
    if (this.props.offlineMode) {
      statusText = 'OFFLINE PREVIEW - NO COMMANDS';
    }
    return (
      <View style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
          <Text style={{ color: '#fff', fontFamily: 'NASA', fontSize: 18 }}>PAVER ARM</Text>
          <TouchableOpacity onPress={() => this.emergencyStop()} accessibilityLabel="Stop arm" style={{ padding: 8 }}>
            <FontAwesome name="stop-circle-o" size={25} color="#ffb3b3" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
          <Text style={{ color: '#dbe1e1', fontSize: 11, flex: 1 }} numberOfLines={2}>
            {statusText}
          </Text>
          <TouchableOpacity onPress={() => this.checkRos()} accessibilityLabel="Check ROS connection" style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 5, backgroundColor: '#5D6061' }}>
            <Text style={{ fontFamily: 'NASA', color: '#fff', fontSize: 12 }}>CHECK ROS</Text>
          </TouchableOpacity>
        </View>
        {this.renderJoint('Base', Robot.PLATE, 'CW', 'CCW', 'rotate-right', 'rotate-left')}
        {this.renderJoint('Gripper', Robot.ENDEFFECTOR, 'Open', 'Close', 'arrow-up', 'arrow-down')}
        {this.renderJoint('Forearm', Robot.FOREARM, 'Up', 'Down', 'arrow-up', 'arrow-down')}
        {this.renderJoint('Shoulder', Robot.SHOULDER, 'Up', 'Down', 'arrow-up', 'arrow-down')}
      </View>
    );
  }
}
