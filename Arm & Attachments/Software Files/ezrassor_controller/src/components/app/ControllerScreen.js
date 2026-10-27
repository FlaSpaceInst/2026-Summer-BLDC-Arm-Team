import React from 'react';
import Modal from './ControllerModal';
import FadeInView from '../../components/app/FadeInView';
import InformationController from './InformationController';
import EZRASSOR from '../../api/ezrassor-service';
import ControllerStyle from '../../styles/controller';
import { Robot, ShoulderOperation, DrumOperation, WheelOperation, Operation } from '../../enumerations/robot-commands';
import {
  Text,
  View,
  TouchableHighlight,
  TouchableOpacity,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  TextInput,
  ScrollView,
  Platform
} from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { isIpReachable } from '../../functionality/connection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWebLayout } from '../../functionality/web-layout';
import ArmControlPanel from './ArmControlPanel';
import CameraFeed from './CameraFeed';
import { getNextControlMode } from '../../functionality/control-modes';

const CONNECTION_POLLING_INTERVAL = 2000;
const CONNECTION_POLLING_TIMEOUT = 4000;
const CONNECTION_POLLING_VERBOSE = false;

/**
 * React component for the actual rover controller interface.
 */
export default class ControllerScreen extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      autonomyModalVisible: false,
      infoModalVisible: false,
      devModalVisible: false,
      ipModal: false,
      xyModal: false,
      isLoading: true,
      control: 0,
      xy: '0,0',
      ip: '',
      offlineMode: false,
      controlMode: this.getInitialMode(props),
      previousControlMode: 'drum',
      screenWidth: 1200,
      screenHeight: 800,
    };

    this.EZRASSOR = new EZRASSOR(this.state.ip);
    this.armPanelRef = React.createRef();
    this.wheelMoving = false;
    this.componentMounted = false;
  }

  getInitialMode(props) {
    const mode = props.route?.params?.initialMode;
    if (mode === 'arm' || mode === 'camera') {
      return mode;
    }
    return 'drum';
  }

  switchControlMode(mode) {
    this.stopWheels();
    if (this.armPanelRef.current) {
      this.armPanelRef.current.stopMotion();
    }
    this.setState((state) => getNextControlMode(mode, state.controlMode, state.previousControlMode));
  }

  pressWheel(operation) {
    this.wheelMoving = true;
    this.sendOperation(Robot.WHEELS, operation);
  }

  stopWheels() {
    if (!this.wheelMoving) {
      return;
    }
    this.wheelMoving = false;
    this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
  }

  stopAllControls() {
    this.stopWheels();
    this.sendOperation(Robot.ALL, Operation.STOP);
    if (this.armPanelRef.current) {
      this.armPanelRef.current.emergencyStop();
    }
  }

  renderCameraPanel() {
    const roverIp = this.state.ip;
    let cameraSource = '';
    if (roverIp && !this.state.offlineMode) {
      let normalizedIp = roverIp;
      if (!normalizedIp.startsWith('http://') && !normalizedIp.startsWith('https://')) {
        normalizedIp = 'http://' + normalizedIp;
      }
      cameraSource = normalizedIp.replace(/\/$/, '') + '/video_feed';
    }
    return (
      <View style={{ flex: 1, minHeight: 430, backgroundColor: '#2e3030', borderRadius: 10, padding: 12, alignItems: 'stretch' }}>
        <Text style={{ textAlign: 'center', color: '#fff', fontFamily: 'NASA', fontSize: 21, marginBottom: 12 }}>CAMERA MODE</Text>
        {cameraSource ? (
          <CameraFeed source={{ uri: cameraSource }} style={{ flex: 1, minHeight: 320, backgroundColor: '#3a3d3d', borderRadius: 8 }} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#3a3d3d', borderRadius: 8, minHeight: 320 }}>
            <FontAwesome name="video-camera" size={48} color="#d2d8d8" />
            <Text style={{ color: '#fff', fontFamily: 'NASA', fontSize: 20, marginTop: 12 }}>CAMERA PREVIEW</Text>
            <Text style={{ color: '#d2d8d8', textAlign: 'center', marginTop: 8 }}>Connect to the rover to view the live feed</Text>
          </View>
        )}
        <Text style={{ color: '#d2d8d8', fontSize: 12, textAlign: 'center', marginTop: 10 }}>WHEEL CONTROLS REMAIN AVAILABLE ON THE LEFT</Text>
      </View>
    );
  }

  async componentDidMount() {
    this.componentMounted = true;
    await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });
    await this.getIpFromStorage();
    if (!this.componentMounted) {
      return;
    }

    const offlineMode = this.props.route?.params?.offlineMode === true;
    this.setState({ isLoading: false, offlineMode });

    this._unsubscribe = this.props.navigation.addListener('focus', async () => {
      this.getIpFromStorage();
    });

    this._blur = this.props.navigation.addListener('blur', () => this.stopAllControls());
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      this.onVisibilityChange = () => {
        if (document.hidden) {
          this.stopAllControls();
        }
      };
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    // Set up the connection polling logic.
    if (!offlineMode) {
      let pollCount = 0;
      this.connectionPoller = setInterval(async () => {
        if (await isIpReachable(this.state.ip, CONNECTION_POLLING_TIMEOUT)) {
          if (CONNECTION_POLLING_VERBOSE) {
            console.log(`Connection poll attempt ${++pollCount} succeeded...`);
          }
        } else {
          console.log(`Dropped connection from ${this.state.ip}... redirecting to connection screen.`);
          this.props.navigation.replace('Connection Status Screen', { screen: 'roverDisconnected' });
        }
      }, CONNECTION_POLLING_INTERVAL);
    }

    const pollInterval = (CONNECTION_POLLING_INTERVAL / 1000.0).toFixed(2);
    const pollTimeout = (CONNECTION_POLLING_TIMEOUT / 1000.0).toFixed(2);
    console.log(`Polling every ${pollInterval}s with a ${pollTimeout}s timeout.`);
  }

  componentWillUnmount() {
    this.componentMounted = false;
    this.stopAllControls();
    clearInterval(this.connectionPoller);

    if (this._unsubscribe) {
      this._unsubscribe();
    }
    if (this._blur) {
      this._blur();
    }
    if (this.onVisibilityChange && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  async getIpFromStorage() {
    try {
      const ip = await AsyncStorage.getItem('myIp');

      if (ip != null) {
        this.changeIP(ip);
      }
    } catch (error) {
      // Error retrieving data. Do nothing.
    }
  }

  setAutonomyModalVisible(visible) {
    this.setState({ autonomyModalVisible: visible });
  }

  setInfoModalVisible(visible) {
    this.setState({ infoModalVisible: visible });
  }

  setDevModalVisible(visible) {
    this.setState({ devModalVisible: visible });
  }

  setIPModalVisible(visible) {
    this.setState({ ipModal: visible });
  }

  setXYModalVisible(visible) {
    this.setState({ xyModal: visible });
  }

  changeXY(combined) {
    this.setState({ xy: combined }, () => {
      if (this.state.offlineMode) {
        return;
      }
      this.EZRASSOR.setCoordinate(this.state.xy);
    });
  }

  /**
   * Set `this.state.ip` and `this.EZRASSOR.host` to the specified IP + port.
   * 
   * @param {string} ip IP + port.
   */
  changeIP(ip) {
    this.setState({ ip }, () => {
      this.EZRASSOR.host = ip;
    });
  }

  /**
   * Update animation frame before processing click so that opacity can change on click.
   */
  sendOperation(part, operation) {
    if (this.state.offlineMode) {
      return;
    }

    const command = this.EZRASSOR.executeRobotCommand(part, operation);
    if (command && typeof command.catch === 'function') {
      command.catch((error) => {
        console.error('Rover command failed:', error);
      });
    }
  }

  getArmModeButtonLabel() {
    if (this.state.controlMode === 'arm') {
      return 'Drum Mode';
    }
    return 'Arm Mode';
  }

  renderDrumControls() {
    return (
      <View style={{ flex: 1 }}>
            <View style={{ flex: 8 }}>

              {/* Top row of controls. */}
              <View style={{ flexDirection: 'row' }}>

                <View style={{ flexDirection: 'row' }}>

                  {/* Raise left-shoulder button. */}
                  <View>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.RAISE);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="chevron-up" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Lower left-shoulder button. */}
                  <View style={{ marginHorizontal: 15 }}>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.LOWER);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="chevron-down" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                </View>

                <View style={ControllerStyle.rightSideRow}>

                  {/* Raise right-shoulder button. */}
                  <View style={{ marginHorizontal: 15 }}>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.RAISE);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="chevron-up" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Lower right-shoulder button. */}
                  <View>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.LOWER);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="chevron-down" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                </View>

              </View>

              {/* Thin image of rover. */}
              <Image
                style={ControllerStyle.image}
                source={require('../../../assets/rassor.png')}
              />

              {/* Bottom row of controls. */}
              <View style={{ flexDirection: "row" }}>

                <View style={{ flexDirection: "row" }}>

                  {/* Dump left-bucket button. */}
                  <View>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(
                          Robot.FRONTDRUM,
                          DrumOperation.DUMP
                        );
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.FRONTDRUM, DrumOperation.STOP);
                      }}
                    >
                      <FontAwesome name="rotate-left" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Dig left-bucket button. */}
                  <View style={{ marginHorizontal: 15 }}>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(
                          Robot.FRONTDRUM,
                          DrumOperation.DIG
                        );
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.FRONTDRUM, DrumOperation.STOP);
                      }}
                    >
                      <FontAwesome name="rotate-right" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                </View>

                <View style={ControllerStyle.rightSideRow}>

                  {/* Dig right-bucket button. */}
                  <View style={{ marginHorizontal: 15 }}>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(
                          Robot.BACKDRUM,
                          DrumOperation.DIG
                        );
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.BACKDRUM, DrumOperation.STOP);
                      }}
                    >
                      <FontAwesome name="rotate-left" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Dump right-bucket button. */}
                  <View>
                    <TouchableOpacity
                      style={ControllerStyle.armMovementButton}
                      onPressIn={() => {
                        this.sendOperation(
                          Robot.BACKDRUM,
                          DrumOperation.DUMP
                        );
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.BACKDRUM, DrumOperation.STOP);
                      }}
                    >
                      <FontAwesome name="rotate-right" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                </View>

              </View>

            </View>

      </View>
    );
  }

  getBodyDirection() {
    if (Platform.OS === 'web' && this.state.screenWidth < 1050) {
      return 'column';
    }
    if (this.state.screenWidth >= 980) {
      return 'row';
    }
    return 'column';
  }

  render() {
    // I.e., don't do full render if font is still loading...
    if (this.state.isLoading) {
      return <View style={{ flex: 1, backgroundColor: '#5D6061' }} />;
    }

    const webLayout = getWebLayout(this.state.screenWidth, this.state.screenHeight, Platform.OS);

    return (
      <View style={[ControllerStyle.container, { width: '100%', minHeight: 0 }]} onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        const height = event.nativeEvent.layout.height;
        if (Math.abs(width - this.state.screenWidth) > 10 || Math.abs(height - this.state.screenHeight) > 10) {
          this.setState({ screenWidth: width, screenHeight: height });
        }
      }}>

        <StatusBar hidden />

        {/* Autonomy popup modal. */}
        <Modal
          supportedOrientations={['landscape']}
          style={ControllerStyle.modalViewContainer}
          isVisible={this.state.autonomyModalVisible}
          onSwipeComplete={() => this.setAutonomyModalVisible(!this.state.autonomyModalVisible)}
          swipeDirection={["down", "up", "left", "right"]}
          onRequestClose={() =>
            this.setAutonomyModalVisible(!this.state.autonomyModalVisible)
          }
        >
          <View style={{ flex: 1, marginHorizontal: 15, justifyContent: "center" }}>
            <View>

              {/* Modal title container. */}
              <View style={{ flexDirection: "row", marginVertical: 15, justifyContent: "center" }}>
                <Text style={ControllerStyle.textLarge}>
                  Activate Autonomous Function(s)
                </Text>
              </View>

              {/* Modal body container. */}
              <View style={[
                { flexDirection: "row", marginVertical: 15, justifyContent: "center" },
                Platform.OS === "web" && { flexWrap: "wrap", gap: 10 }
              ]}>

                {/* Button: Drive. */}
                <TouchableOpacity
                  style={[ControllerStyle.modalButton, Platform.OS === "web" && { flex: 0, minWidth: 130, minHeight: 66, marginHorizontal: 3 }]}
                  onPress={() => this.setXYModalVisible(true)}
                >
                  <Text style={ControllerStyle.textSmall}>Drive</Text>
                </TouchableOpacity>

                {/* Button: Dig. */}
                <TouchableOpacity
                  style={[ControllerStyle.modalButton, Platform.OS === "web" && { flex: 0, minWidth: 130, minHeight: 66, marginHorizontal: 3 }]}
                  onPress={() => {
                    this.sendOperation(Robot.AUTONOMY, Operation.DIG);
                  }}
                >
                  <Text style={ControllerStyle.textSmall}>Dig</Text>
                </TouchableOpacity>

                {/* Button: Dump. */}
                <TouchableOpacity
                  style={[ControllerStyle.modalButton, Platform.OS === "web" && { flex: 0, minWidth: 130, minHeight: 66, marginHorizontal: 3 }]}
                  onPress={() => {
                    this.sendOperation(Robot.AUTONOMY, Operation.DUMP);
                  }}
                >
                  <Text style={ControllerStyle.textSmall}>Dump</Text>
                </TouchableOpacity>

                {/* Button: Self-Right. */}
                <TouchableOpacity
                  style={[ControllerStyle.modalButton, Platform.OS === "web" && { flex: 0, minWidth: 130, minHeight: 66, marginHorizontal: 3 }]}
                  onPress={() => {
                    this.sendOperation(Robot.AUTONOMY, Operation.SELFRIGHT);
                  }}
                >
                  <Text style={[ControllerStyle.textSmall, ControllerStyle.columnText]}>
                    Self - Right
                  </Text>
                </TouchableOpacity>

                {/* Button: Full-Auto. */}
                <TouchableOpacity
                  style={[ControllerStyle.modalButton, Platform.OS === "web" && { flex: 0, minWidth: 130, minHeight: 66, marginHorizontal: 3 }]}
                  onPress={() => {
                    this.sendOperation(Robot.AUTONOMY, Operation.FULLAUTONOMY);
                  }}
                >
                  <Text style={[ControllerStyle.textSmall, ControllerStyle.columnText]}>
                    Auto Mode
                  </Text>
                </TouchableOpacity>

              </View>

            </View>
          </View>
        </Modal>

        {/* Info popup modal. */}
        <Modal
          supportedOrientations={['landscape']}
          style={ControllerStyle.modalViewContainer}
          isVisible={this.state.infoModalVisible}
          onSwipeComplete={() => this.setInfoModalVisible(false)}
          swipeDirection={["down", "up", "left", "right"]}
          onRequestClose={() => this.setInfoModalVisible(false)}
        >
          <InformationController></InformationController>
        </Modal>

        {/* Drive-autonomy-input modal. */}
        <Modal
          supportedOrientations={['landscape']}
          style={ControllerStyle.modalViewContainer}
          isVisible={this.state.xyModal}
          onSwipeComplete={() => this.setXYModalVisible(false)}
          swipeDirection="down"
          onRequestClose={() => {
            this.setXYModalVisible(false);
          }}
        >
          <KeyboardAvoidingView paddingLeft={64} paddingRight={64}>

            {/* Prompt. */}
            <Text
              style={[ControllerStyle.textSmall, ControllerStyle.columnText]}
            >
              Enter the X,Y coordinates where the robot will drive to
            </Text>

            {/* Input field. */}
            <TextInput
              style={ControllerStyle.ipInputBox}
              onChangeText={(text) => this.changeXY(text)}
              value={this.state.xy}
              placeholder="x,y"
              marginVertical={20}
            />

            {/* Done button. */}
            <TouchableOpacity
              style={{
                alignItems: 'center',
                backgroundColor: '#DDDDDD',
                padding: 10,
              }}
              onPress={() => {
                this.sendOperation(Robot.AUTONOMY, Operation.DRIVE);
                this.setXYModalVisible(false);
              }}
            >
              <Text>Done</Text>
            </TouchableOpacity>

          </KeyboardAvoidingView>
        </Modal>

        {/* Controller screen top row controls. */}
        <FadeInView style={[
          ControllerStyle.headerContainer,
          webLayout.isWeb && { flex: 0, flexShrink: 0, minHeight: 76, width: '98%', maxWidth: 1500, alignSelf: 'center' },
          webLayout.isCompact && { minHeight: 110, flexWrap: 'wrap', padding: 6 }
        ]}>

          {/* Info button. */}
          <TouchableOpacity
            style={{ flex: 1, padding: 3 }}
            onPress={() => { this.setInfoModalVisible(true); }}
          >
            <FontAwesome name="info-circle" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Set-IP button. */}
          <TouchableOpacity
            style={{ flex: 1, padding: 1 }}
            onPress={() => { this.stopAllControls(); this.props.navigation.replace("IPConnect Screen"); }}
          >
            <FontAwesome name="wifi" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Title. */}
          <Text style={[
            ControllerStyle.textMedium,
            webLayout.isWeb && { fontSize: 21, flexShrink: 1 },
            webLayout.isCompact && { fontSize: 17, minWidth: 140 }
          ]}>EZ-RASSOR Controller</Text>

          {/* Stop-rover button. */}
          <TouchableOpacity
            style={{ flex: 1, padding: 3 }}
            onPress={() => this.stopAllControls()}
          >
            <FontAwesome
              style={{ marginLeft: 'auto' }}
              name="stop-circle-o"
              size={35}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Arm control mode switch. */}
          <TouchableOpacity
            style={ControllerStyle.headerModeButton}
            onPress={() => this.switchControlMode('arm')}
          >
            <MaterialCommunityIcons
              name="robot-industrial"
              size={28}
              color="#fff"
            />
            <Text style={[ControllerStyle.headerModeButtonText, { height: 'auto', fontSize: 14 }]}>{this.getArmModeButtonLabel()}</Text>
          </TouchableOpacity>
          
          {/* Autonomy button. */}
          <TouchableOpacity
            style={{ flex: 1, padding: 3 }}
            onPress={() => { this.setAutonomyModalVisible(true); }}
          >
            <MaterialCommunityIcons
              style={{ marginLeft: 'auto' }}
              name="robot"
              size={32}
              color="#fff"
            />
          </TouchableOpacity>

          {/* TODO make sure this passes the IP address to video screen  */}
          {/* Camera mode replaces the right-side controls; wheels remain available. */}
          <TouchableOpacity
            accessibilityLabel="Toggle camera mode"
            style={{ flex: 1, padding: 3 }}
            onPress={() => this.switchControlMode('camera')}
          >
            <FontAwesome
              style={{ marginLeft: 'auto' }}
              name="video-camera"
              size={30}
              color="#fff" />
          </TouchableOpacity>

        </FadeInView>

        {/* Body container. */}
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[
            { flexDirection: this.getBodyDirection(), minHeight: 550, padding: 8, alignItems: 'stretch' },
            webLayout.isWeb && { width: '100%', maxWidth: 1500, alignSelf: 'center', alignItems: 'stretch' },
            webLayout.isStacked && { minHeight: 880, gap: 12, paddingHorizontal: 12 }
          ]}
        >

          {/* Wheel buttons. */}
          <View style={[
            ControllerStyle.wheelFunctionContainer,
            webLayout.isStacked && { flex: 0, minHeight: 310, width: '100%', marginLeft: 0, marginRight: 0 }
          ]}>


            {/* Forwards button. */}
            <TouchableOpacity style={ControllerStyle.upAndDownDPad}
              onPressIn={() => this.pressWheel(WheelOperation.FORWARD)}
                onPressOut={() => this.stopWheels()}
            >
              <FontAwesome name="chevron-up" size={50} color="#fff" />
            </TouchableOpacity>

            {/* Left and right buttons. */}
            <View style={{ flex: 2, flexDirection: 'row' }}>

              {/* Left button. */}
              <TouchableOpacity style={ControllerStyle.dPadLeft}
                onPressIn={() => this.pressWheel(WheelOperation.LEFT)}
                onPressOut={() => this.stopWheels()}
              >
                <FontAwesome name="chevron-left" size={50} color="#fff" />
              </TouchableOpacity>

              {/* Center stop button: reset wheel speed to zero. */}
              <TouchableOpacity
                accessibilityLabel="Stop wheels"
                style={{ width: 58, height: 58, alignSelf: 'center', marginHorizontal: 4, backgroundColor: '#5D6061', borderRadius: 4, elevation: 5, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => { this.sendOperation(Robot.WHEELS, WheelOperation.STOP); }}
              >
                <FontAwesome name="stop" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Right button. */}
              <TouchableOpacity style={ControllerStyle.dPadRight}
                onPressIn={() => this.pressWheel(WheelOperation.RIGHT)}
                onPressOut={() => this.stopWheels()}
              >
                <FontAwesome name="chevron-right" size={50} color="#fff" />
              </TouchableOpacity>
            </View>




            {/* Backwards button. */}
            <TouchableOpacity style={ControllerStyle.upAndDownDPad}
              onPressIn={() => this.pressWheel(WheelOperation.BACKWARD)}
                onPressOut={() => this.stopWheels()}
            >
              <FontAwesome name="chevron-down" size={50} color="#fff" />
            </TouchableOpacity>

          </View>

          {/* Keep the original rover drum panel or replace it with arm/camera controls. */}
          <View style={[
            ControllerStyle.drumFunctionContainer,
            { minWidth: 0, minHeight: 445 },
            webLayout.isStacked && { flex: 0, width: '100%', marginHorizontal: 0 }
          ]}>
            {this.state.controlMode === 'arm' && (
              <ArmControlPanel
                ref={this.armPanelRef}
                roverIp={this.state.ip}
                offlineMode={this.state.offlineMode}
              />
            )}
            {this.state.controlMode === 'camera' && this.renderCameraPanel()}
            {this.state.controlMode === 'drum' && this.renderDrumControls()}
          </View>

        </ScrollView>

      </View>
    );
  }
}
