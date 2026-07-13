import React from 'react';
import Modal from 'react-native-modal';
import FadeInView from 'ezrassor-app/src/components/app/FadeInView';
import InformationController from './InformationController';
import EZRASSOR from 'ezrassor-app/src/api/ezrassor-service';
import ControllerStyle from 'ezrassor-app/src/styles/controller';
import { Robot, ShoulderOperation, DrumOperation, WheelOperation, Operation } from 'ezrassor-app/src/enumerations/robot-commands';
import {
  Text,
  View,
  TouchableHighlight,
  TouchableOpacity,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { isIpReachable } from '../../functionality/connection';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    };

    this.EZRASSOR = new EZRASSOR(this.state.ip);
  }

  async componentDidMount() {
    await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });
    await this.getIpFromStorage();

    this.setState({ isLoading: false });

    this._unsubscribe = this.props.navigation.addListener('focus', async () => {
      this.getIpFromStorage();
    });

    // Set up the connection polling logic.
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

    const pollInterval = (CONNECTION_POLLING_INTERVAL / 1000.0).toFixed(2);
    const pollTimeout = (CONNECTION_POLLING_TIMEOUT / 1000.0).toFixed(2);
    console.log(`Polling every ${pollInterval}s with a ${pollTimeout}s timeout.`);
  }

  async componentWillUnmount() {
    clearInterval(this.connectionPoller);

    this._unsubscribe();
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
    requestAnimationFrame(() => {
      this.EZRASSOR.executeRobotCommand(part, operation);
    });
  }

  render() {
    // I.e., don't do full render if font is still loading...
    if (this.state.isLoading) {
      return <View style={{ flex: 1, backgroundColor: '#5D6061' }} />;
    }

    return (
      <View style={ControllerStyle.container}>

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
          <TouchableHighlight style={{ flex: 1, marginHorizontal: 15, justifyContent: "center" }}>
            <View>

              {/* Modal title container. */}
              <View style={{ flexDirection: "row", marginVertical: 15, justifyContent: "center" }}>
                <Text style={ControllerStyle.textLarge}>
                  Activate Autonomous Function(s)
                </Text>
              </View>

              {/* Modal body container. */}
              <View style={{ flexDirection: "row", marginVertical: 15, justifyContent: "center" }}>

                {/* Button: Drive. */}
                <TouchableOpacity
                  style={ControllerStyle.modalButton}
                  onPress={() => this.setXYModalVisible(true)}
                >
                  <Text style={ControllerStyle.textSmall}>Drive</Text>
                </TouchableOpacity>

                {/* Button: Dig. */}
                <TouchableOpacity
                  style={ControllerStyle.modalButton}
                  onPress={() => {
                    this.sendOperation(Robot.AUTONOMY, Operation.DIG);
                  }}
                >
                  <Text style={ControllerStyle.textSmall}>Dig</Text>
                </TouchableOpacity>

                {/* Button: Dump. */}
                <TouchableOpacity
                  style={ControllerStyle.modalButton}
                  onPress={() => {
                    this.sendOperation(Robot.AUTONOMY, Operation.DUMP);
                  }}
                >
                  <Text style={ControllerStyle.textSmall}>Dump</Text>
                </TouchableOpacity>

                {/* Button: Self-Right. */}
                <TouchableOpacity
                  style={ControllerStyle.modalButton}
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
                  style={ControllerStyle.modalButton}
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
          </TouchableHighlight>
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
        <FadeInView style={ControllerStyle.headerContainer}>

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
            onPress={() => this.props.navigation.replace("IPConnect Screen")}
          >
            <FontAwesome name="wifi" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Title. */}
          <Text style={ControllerStyle.textMedium}>EZ-RASSOR Controller</Text>

          {/* Stop-rover button. */}
          <TouchableOpacity
            style={{ flex: 1, padding: 3 }}
            onPress={() => { this.sendOperation(Robot.ALL, Operation.STOP); }}
          >
            <FontAwesome
              style={{ marginLeft: 'auto' }}
              name="stop-circle-o"
              size={35}
              color="#fff"
            />
          </TouchableOpacity>

          {/*Paver Arm controls*/}
          <TouchableOpacity
            style={{ flex: 1, padding: 3 }}
            onPress={() => this.props.navigation.replace("Paver Arm Controller Screen", { currentIp: this.state.ip })}
          >
            <MaterialCommunityIcons
              style={{ marginLeft: 'auto' }}
              name="robot-industrial"
              size={32}
              color="#fff"
            />
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
          {/* View-Video-Screen button.*/}
          <TouchableOpacity
            style={{ flex: 1, padding: 3 }}
            onPress={() => this.props.navigation.replace("Video Controller Screen", { currentIp: this.state.ip })}
          >
            <FontAwesome
              style={{ marginLeft: 'auto' }}
              name="video-camera"
              size={30}
              color="#fff" />
          </TouchableOpacity>

        </FadeInView>

        {/* Body container. */}
        <FadeInView style={ControllerStyle.buttonLayoutContainer}>

          {/* Wheel buttons. */}
          <View style={ControllerStyle.wheelFunctionContainer}>


            {/* Forwards button. */}
            <TouchableOpacity style={ControllerStyle.upAndDownDPad}
              onPressIn={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.FORWARD);
              }}
              onPressOut={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
              }}
            >
              <FontAwesome name="chevron-up" size={50} color="#fff" />
            </TouchableOpacity>

            {/* Left and right buttons. */}
            <View style={{ flex: 2, flexDirection: 'row' }}>

              {/* Left button. */}
              <TouchableOpacity style={ControllerStyle.dPadLeft}
                onPressIn={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.LEFT);
                }}
                onPressOut={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
                }}
              >
                <FontAwesome name="chevron-left" size={50} color="#fff" />
              </TouchableOpacity>

              {/* Right button. */}
              <TouchableOpacity style={ControllerStyle.dPadRight}
                onPressIn={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.RIGHT);
                }}
                onPressOut={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
                }}
              >
                <FontAwesome name="chevron-right" size={50} color="#fff" />
              </TouchableOpacity>
            </View>




            {/* Backwards button. */}
            <TouchableOpacity style={ControllerStyle.upAndDownDPad}
              onPressIn={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.BACKWARD);
              }}
              onPressOut={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
              }}
            >
              <FontAwesome name="chevron-down" size={50} color="#fff" />
            </TouchableOpacity>

          </View>

          {/* Drum/shoulder buttons. */}
          <View style={ControllerStyle.drumFunctionContainer}>
            <View style={{ flex: 8 }}>

              {/* Top row of controls. */}
              <View style={{ flexDirection: 'row' }}>

                <View style={{ flexDirection: 'row' }}>

                  {/* Raise left-shoulder button. */}
                  <View>
                    <TouchableOpacity
                      onPressIn={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.RAISE);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="arrow-circle-up" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Lower left-shoulder button. */}
                  <View style={{ marginHorizontal: 15 }}>
                    <TouchableOpacity
                      onPressIn={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.LOWER);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.FRONTARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="arrow-circle-down" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                </View>

                <View style={ControllerStyle.rightSideRow}>

                  {/* Raise right-shoulder button. */}
                  <View style={{ marginHorizontal: 15 }}>
                    <TouchableOpacity
                      onPressIn={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.RAISE);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="arrow-circle-up" size={50} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Lower right-shoulder button. */}
                  <View>
                    <TouchableOpacity
                      onPressIn={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.LOWER);
                      }}
                      onPressOut={() => {
                        this.sendOperation(Robot.BACKARM, ShoulderOperation.STOP);
                      }}
                    >
                      <FontAwesome name="arrow-circle-down" size={50} color="#fff" />
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

        </FadeInView>

      </View>
    );
  }
}
