import React from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EZARM from '../../api/ezrassor-service-paver-arm';
import { Robot, Operation } from '../../enumerations/robot-commands-paver-arm';
import { getDefaultArmBridgeHost } from '../../functionality/control-modes';

/**
 * The existing arm commands in a compact panel beside the rover wheel controls.
 * Commands are event-driven: press sends movement, release sends STOP.
 * This panel does not schedule heartbeats or change the rover drivetrain API.
 */
export default class ArmControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bridgeIp: getDefaultArmBridgeHost(props.roverIp),
      bridgeReady: false,
      baseAvailable: false,
      statusMessage: 'CONNECTING TO ARM BRIDGE...',
      showSettings: false,
      activeControl: ''
    };
    this.armService = new EZARM(this.state.bridgeIp);
    this.activePart = null;
    this.activeOperation = null;
    this.componentMounted = false;
    this.savedBridgeIp = false;
    this.bridgeCheckId = 0;
    this.addressEdited = false;
  }

  async componentDidMount() {
    this.componentMounted = true;
    let bridgeIp = this.state.bridgeIp;

    // A controller connected directly to port 3000 is already using the arm
    // mock/bridge. Prefer that selected address over a previously saved rover IP.
    let directlyConnectedToBridge = false;
    if (this.props.roverIp) {
      const selectedHost = this.props.roverIp.replace(/^https?:\/\//, '').split('/')[0];
      directlyConnectedToBridge = selectedHost.endsWith(':3000');
    }

    try {
      const savedIp = await AsyncStorage.getItem('armBridgeIp');
      if (!this.componentMounted) {
        return;
      }
      if (savedIp && !this.addressEdited && !directlyConnectedToBridge) {
        this.savedBridgeIp = true;
        bridgeIp = savedIp;
      }
    } catch (error) {
      // If storage is unavailable, check the bridge derived from the rover IP.
    }

    if (!this.componentMounted) {
      return;
    }
    if (this.addressEdited || !this.savedBridgeIp) {
      bridgeIp = this.state.bridgeIp;
    }

    this.armService.host = bridgeIp;
    this.setState({ bridgeIp }, () => {
      // One health check when Arm Mode opens. There is no heartbeat or polling.
      this.checkBridge(bridgeIp);
    });
  }

  componentDidUpdate(previousProps) {
    if (!this.savedBridgeIp && previousProps.roverIp !== this.props.roverIp) {
      const previousDefault = getDefaultArmBridgeHost(previousProps.roverIp);
      if (this.state.bridgeIp === previousDefault) {
        const nextDefault = getDefaultArmBridgeHost(this.props.roverIp);
        this.bridgeCheckId += 1;
        this.armService.host = nextDefault;
        this.setState({ bridgeIp: nextDefault, bridgeReady: false, baseAvailable: false }, () => {
          this.checkBridge(nextDefault);
        });
      }
    }
  }

  componentWillUnmount() {
    this.componentMounted = false;
    this.bridgeCheckId += 1;
    this.stopMotion();
  }

  async checkBridge(requestedIp) {
    // Ignore late replies from older checks or from an address being edited.
    const checkId = ++this.bridgeCheckId;
    if (this.props.offlineMode) {
      if (this.componentMounted) {
        this.setState({ bridgeReady: false, baseAvailable: false, statusMessage: 'OFFLINE PREVIEW: commands disabled' });
      }
      return;
    }

    let bridgeIp = this.state.bridgeIp;
    if (requestedIp !== undefined) {
      bridgeIp = requestedIp;
    }
    bridgeIp = bridgeIp.trim();
    if (!bridgeIp) {
      this.setState({ bridgeReady: false, baseAvailable: false, statusMessage: 'ENTER BRIDGE IP:PORT' });
      return;
    }

    this.setState({ bridgeReady: false, baseAvailable: false, statusMessage: 'CHECKING BRIDGE...' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      let url = bridgeIp;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      const response = await fetch(url.replace(/\/$/, '') + '/health', { signal: controller.signal });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      const status = await response.json();
      if (!status.armOpen || !status.handOpen) {
        throw new Error('Arm or hand Arduino disconnected');
      }
      if (!this.componentMounted || checkId !== this.bridgeCheckId) {
        return;
      }

      this.armService.host = bridgeIp;
      this.savedBridgeIp = true;
      this.setState({
        bridgeReady: true,
        baseAvailable: status.wheelsOpen === true && status.baseEnabled === true,
        statusMessage: 'ARM + HAND CONNECTED',
        showSettings: false
      });
      // Storage failures should not disable a currently connected bridge.
      try {
        await AsyncStorage.setItem('armBridgeIp', bridgeIp);
      } catch (error) {
        // The bridge remains usable for the current session.
      }
    } catch (error) {
      if (this.componentMounted && checkId === this.bridgeCheckId) {
        this.setState({ bridgeReady: false, baseAvailable: false, statusMessage: 'BRIDGE UNAVAILABLE: ' + error.message });
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendCommand(part, operation) {
    if (this.props.offlineMode) {
      return;
    }
    if (!this.state.bridgeReady && operation !== Operation.STOP) {
      return;
    }
    try {
      await this.armService.executeRobotCommand(part, operation);
    } catch (error) {
      this.armService.allStop().catch(() => {});
      if (this.componentMounted) {
        this.setState({ bridgeReady: false, activeControl: '', statusMessage: 'COMMAND FAILED: ' + error.message });
      }
    }
  }

  pressMotion(part, operation, label) {
    if (this.props.offlineMode || !this.state.bridgeReady) {
      return;
    }
    if (part === Robot.PLATE && !this.state.baseAvailable) {
      return;
    }
    if (this.activePart) {
      if (this.activePart === part && this.activeOperation === operation) {
        return;
      }
      this.sendCommand(this.activePart, Operation.STOP);
    }
    this.activePart = part;
    this.activeOperation = operation;
    this.setState({ activeControl: label, statusMessage: 'MOVING: ' + label });
    this.sendCommand(part, operation);
  }

  releaseMotion(part) {
    if (part !== this.activePart) {
      return;
    }
    this.stopMotion();
  }

  stopMotion() {
    if (!this.activePart) {
      return;
    }
    const part = this.activePart;
    this.activePart = null;
    this.activeOperation = null;
    if (this.componentMounted) {
      this.setState({ activeControl: '', statusMessage: 'STOP REQUESTED' });
    }
    this.sendCommand(part, Operation.STOP);
  }

  emergencyStop() {
    this.activePart = null;
    this.activeOperation = null;
    if (this.componentMounted) {
      this.setState({ activeControl: '', statusMessage: 'ARM STOP REQUESTED' });
    }
    this.sendCommand(Robot.ALL, Operation.STOP);
  }

  renderJoint(label, part, positiveLabel, negativeLabel, positiveIcon, negativeIcon) {
    const disabled = this.props.offlineMode || !this.state.bridgeReady || (part === Robot.PLATE && !this.state.baseAvailable);
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
    return (
      <TouchableOpacity
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => this.pressMotion(part, operation, label)}
        onPressOut={() => this.releaseMotion(part)}
        style={{ flex: 1, minHeight: 54, borderRadius: 9, backgroundColor, opacity: buttonOpacity, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 12 }}
      >
        <Text style={{ fontFamily: 'NASA', color: '#fff', fontSize: 15 }}>{text}</Text>
        <FontAwesome name={icon} size={24} color="#fff" />
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
          <TouchableOpacity onPress={() => { this.stopMotion(); this.setState({ showSettings: !this.state.showSettings }); }} accessibilityLabel="Configure arm bridge" style={{ padding: 8 }}>
            <FontAwesome name="wifi" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.emergencyStop()} accessibilityLabel="Stop arm" style={{ padding: 8 }}>
            <FontAwesome name="stop-circle-o" size={25} color="#ffb3b3" />
          </TouchableOpacity>
        </View>
        {this.state.showSettings && (
          <View style={{ backgroundColor: '#3a3d3d', padding: 10, borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontFamily: 'NASA', marginBottom: 5 }}>ARM BRIDGE IP:PORT</Text>
            <TextInput
              accessibilityLabel="Arm bridge address"
              style={{ backgroundColor: '#BFBFBF', color: '#171919', borderRadius: 5, padding: 9, fontSize: 15 }}
              value={this.state.bridgeIp}
              autoCapitalize="none"
              onChangeText={(bridgeIp) => { this.stopMotion(); this.bridgeCheckId += 1; this.addressEdited = true; this.setState({ bridgeIp, bridgeReady: false, baseAvailable: false, statusMessage: 'CHECK BRIDGE TO CONNECT' }); }}
            />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
          <Text style={{ color: '#dbe1e1', fontSize: 11, flex: 1 }} numberOfLines={2}>
            {statusText}
          </Text>
          <TouchableOpacity onPress={() => this.checkBridge()} accessibilityLabel="Check arm bridge" style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 5, backgroundColor: '#5D6061' }}>
            <Text style={{ fontFamily: 'NASA', color: '#fff', fontSize: 12 }}>CHECK BRIDGE</Text>
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
