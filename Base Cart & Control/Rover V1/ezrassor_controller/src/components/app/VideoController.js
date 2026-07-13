import { TouchableOpacity, StyleSheet, Text, View, Alert, TouchableHighlight } from 'react-native';
import * as React from 'react';
import Modal from 'react-native-modal';
import { WebView } from 'react-native-webview';
import EZRASSOR from 'ezrassor-app/src/api/ezrassor-service';
import EZARM from 'ezrassor-app/src/api/ezrassor-service-paver-arm'
import { Robot, ShoulderOperation, DrumOperation, WheelOperation, Operation } from 'ezrassor-app/src/enumerations/robot-commands';
import { isIpReachable } from '../../functionality/connection';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import ControllerStyle from 'ezrassor-app/src/styles/controller';
import PaverArmControllerStyle from 'ezrassor-app/src/styles/controllerPaverArm';
import VideoStyle from 'ezrassor-app/src/styles/video';

const VIDEO_EXT_STANDARD = '/video_feed';
const DETECTION_POLLING_EXTENSION = '/is_detection';
const DETECTION_POLLING_INTERVAL = 5000;

const CONNECTION_POLLING_INTERVAL = 2000;
const CONNECTION_POLLING_TIMEOUT = 4000;
const CONNECTION_POLLING_VERBOSE = false;

export default class VideoController extends React.Component {

  /**
   * Constructor for VideoController componenet
   * ip variable is part of props passed to this component from ControllerScreen component 
   */
  constructor(props) {
    super(props);

    this.pollForDetection = this.pollForDetection.bind(this);

    this.state = {
      autonomyModalVisible: false,
      infoModalVisible: false,
      devModalVisible: false,
      ipModal: false,
      xyModal: false,
      isLoading: true,
      isDetecting: false,
      control: 0,
      xy: '0,0',
      ip: '',
      videoIp: '',
      pollingRoute: '',
    };

    this.EZARM = new EZARM(this.state.ip);
    this.EZRASSOR = new EZRASSOR(this.state.ip);
  }

  set detectionReport(report) {

  }

  /**
   * Load assets required for this component and check connection to IP address
   */
  async componentDidMount() {
    await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });
    await this.getIpFromStorage();
    this.state.ip = this.props.route.params.currentIp; // setting ip address
    // important line: sets the IP address for current EZRASSOR instance
    this.EZRASSOR.host = this.state.ip;

    // Set IP address to retreive video feed from
    this.state.videoIp = 'http://' + this.state.ip + VIDEO_EXT_STANDARD;

    // Set IP address to poll for detection report from 
    this.state.pollingRoute = this.state.ip + DETECTION_POLLING_EXTENSION;

    // this.state.videoIp = this.props.route.params.currentIp + this.videoExtension;
    console.log('Set videoIp to: ' + this.state.videoIp);
    console.log('Set polling route to: ' + this.state.pollingRoute);

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

  setAutonomyModalVisible(invisible) {
    this.setState({ autonomyModalVisible: invisible });
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
   * Retrieves IP addreess saved previously in AsyncStorage 
   */
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

  /**
   * Set `this.state.ip` and `this.EZRASSOR.host` to the specified IP + port.
   * 
   * @param {string} ip IP + port
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

  /**
   * Update animation frame before processing click so that opacity can change on click.
   */
  // TODO: verify this sends coordiantes of paver to this function and handle it on the arm service
  sendPickUpOperation(part, operation) {
    requestAnimationFrame(() => {
      this.EZARM.executeRobotCommand(part, operation)
    });
  }

  /**
   * Stop and start the paver detection polling service
   * Call function to change video extension, 
   * causing the component to re-render with the new soucre for video feed
   */
  togglePaverDetection() {
    if (this.state.isDetecting) {
      this.state.isDetecting = false;
      this.stopDetectionPolling();
    }
    else {
      this.state.isDetecting = true;
      this.startDetectionPolling();
    }
  }

  /**
    * Poll Controller Server Detection API to confirm a paver is still in view to pick
    */
  async confirmDetection(x, y, z) {
    const response = await fetch('http://' + this.state.pollingRoute)
      .then((response) => response.json())
      .then((json) => console.log(json));

    pickUpOperation = json.x.toString() + json.y.toString() + json.z.toString();

    if (json.hasOwnProperty('x')) {
      // TODO: check that this is the same pave the user wanted to pick up
      // Figure out how to verify that it is the same paver the user said to pick up
      //this.sendPickUpOperation(Arm.AUTONOMY, pickUpOperation);
      console.log("paver to pick up confirmed")
    }
    else {
      console.log("paver to pick up no longer in view")
    }
  }

  /**
   * Handles request to pick up paver
   * 
   */
  handlePickUpRequest(x, y, z) {
    // TODO: add this to send command to arm for picking up paver
    // Need to finish aruco postion calculation first
    // this.EZRASSOR.sendOperation(Robot.WHEELS, WheelOperation.STOP);
    // this.confirmDetection(x, y, z);
  }

  /**
   * Creates and shows dialog box with paver detection info
   */
  createPaverNotification(x, y, z) {
    Alert.alert('Paver Detected at ' + x + ', ' + y + ', ' + z, 'choose arm action', [
      {
        text: 'Ignore',
        onPress: () => this.startDetectionPolling(), // Restart detection polling if user chooses to ingore current paver
        style: 'cancel',
      },
      { text: 'Pick Up (Not implimented yet)', onPress: () => this.handlePickUpRequest(x, y, z) }, // Prepare to pick up paver
    ]);
  }

  /**
   * Starts polling to Controller Server API for detection of Pavers.
   * Sets interval polling function will be called at.
   */
  startDetectionPolling() {
    console.log("Starting Detection Polling");
    
    this.detectionTask = setInterval(this.pollForDetection, DETECTION_POLLING_INTERVAL);
  }

  /**
   * Stops polling to Controller Server API for detection of Pavers.
   */
  stopDetectionPolling() {
    console.log("Stopping Detection Polling");
    clearInterval(this.detectionTask);
  }

  /**
    * Poll Controller Server API to check for detection of Pavers.
    * Makes API requests at specified interval
    */
  async pollForDetection() {
    console.log("Polling for detection at: " + this.state.pollingRoute);

    let response = await fetch('http://' + this.state.pollingRoute);
    let data = await response.json();

    console.log(data);

    // JSON response contains detection report, stop detection polling and create notification
    if (data.hasOwnProperty('x')) {
      this.stopDetectionPolling();
      this.createPaverNotification(data.x, data.y, data.z);
    }
    else {
      console.log("Detection report did not have a coordinate");
    }
  }

  // Stop detection polling and navigate to standard controller screen
  switchToControllerScreen() {
    if (this.state.isDetecting) {
      this.stopDetectionPolling();
      this.state.isDetecting = false;
    }
    this.props.navigation.replace("Controller Screen");
  }

  render() {
    console.log('Video Feed IP Addr: ' + this.state.videoIp);

    // Use WebView to render the webpage hosting the live video streaming from EZRASSOR
    return (
      <View style={styles.container}>

        {/* Video Controller page Info popup modal. */}
        <Modal
          supportedOrientations={['landscape']}
          style={ControllerStyle.modalViewContainer}
          isVisible={this.state.infoModalVisible}
          onSwipeComplete={() => this.setInfoModalVisible(false)}
          swipeDirection={["down", "up", "left", "right"]}
          onRequestClose={() => this.setInfoModalVisible(false)}
        >

        <TouchableHighlight style={{ justifyContent: 'center' }}>
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 25}}>
              <Text style={PaverArmControllerStyle.textLarge}>Controller Help</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginHorizontal:"0.5%"}}>
              <View style={{ flex: 1}} >
                <FontAwesome style={{textAlign:'center'}} name="wifi" size={30} color='#fff'/>
                <Text style={PaverArmControllerStyle.textSmallCenter}> 
                  Connects to the server with input string: {'\n'} 
                  IP : PORT
                </Text>
              </View> 

              {/* Vertical separating bar. */}
              <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

              <View style={{ flex: 1}} >
              <MaterialCommunityIcons style={{textAlign:'center'}} name="cube-scan" size={32} color="#fff"/>
                <Text style={PaverArmControllerStyle.textSmallCenter}>
                  Start/Stop Paver Detection notification
                </Text>
              </View>

              {/* Vertical separating bar. */}
              <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

              <View style={{ flex: 1}} >
                <FontAwesome style={{textAlign:'center'}} name="stop-circle-o" size={30} color='#fff'/>
                  <Text style={PaverArmControllerStyle.textSmallCenter}> 
                    Emergency stop for manual movements
                  </Text>
              </View>

              {/* Vertical separating bar. */}
              <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

              <View style={{ flex: 1}} >
              <MaterialCommunityIcons style={{textAlign:'center'}} name="robot-industrial" size={32} color="#fff"/>
                <Text style={PaverArmControllerStyle.textSmallCenter}>
                  Navigate to Paver Arm Controller
                </Text>
              </View>

              {/* Vertical separating bar. */}
              <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

              <View style={{ flex: 1}} >
              <FontAwesome5 style={{textAlign:'center'}} name="video-slash" size={32} color='#fff'/>
                <Text style={PaverArmControllerStyle.textSmallCenter}> 
                  Stop Live Stream
                </Text>
              </View>
            </View>
          </View>
        </TouchableHighlight>

        </Modal>

        <View style={styles.webViewContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ uri: this.state.videoIp }}
            style={styles.webView}
          />

          <View style={styles.overlayedMenu}>
            {/* Controller screen top row controls. */}
            <View style={VideoStyle.headerContainer}>
              {/* Info button. */}
              <TouchableOpacity
                style={{ flex: 1, padding: 3, alignItems: "center" }}
                onPress={() => { this.setInfoModalVisible(true); }}
              >
                <FontAwesome name="info-circle" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Set-IP button. */}
              <TouchableOpacity
                style={{ flex: 1, padding: 1, alignItems: "center" }}
                onPress={() => this.props.navigation.replace("IPConnect Screen")}
              >
                <FontAwesome name="wifi" size={30} color="#fff" />
              </TouchableOpacity>

              {/* Toggle paver detection button. */}
              <TouchableOpacity
                style={{ flex: 1, padding: 1, alignItems: "center"}}
                onPress={() => this.togglePaverDetection()}
              >
                <MaterialCommunityIcons
                  style={{ flex: 1, marginHorizontal: "22%", marginVertical:"20%"}}
                  name="cube-scan"
                  size={32}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* Title. */}
              <Text style={ControllerStyle.textMedium}>EZ-RASSOR Controller</Text>

              {/* Stop-rover button. */}
              <TouchableOpacity
                style={{ flex: 1 }}
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

              {/* Back to Controller Screen button.*/}
              <TouchableOpacity
                style={{ flex: 1, padding: 3 }}
                onPress={() => this.switchToControllerScreen()}
              >
                <FontAwesome5
                  style={{ marginLeft: 'auto' }}
                  name="video-slash"
                  size={30}
                  color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Wheel, Shoulder, and Drum buttons */}
          <View style={styles.buttonContainer}>

            {/* Forwards button. */}
            <TouchableOpacity style={VideoStyle.upAndDownDPad}
              onPressIn={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.FORWARD);
              }}
              onPressOut={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
              }}
            >
              <FontAwesome name="chevron-up" size={40} color="#fff" />
            </TouchableOpacity>

            {/* Backwards button. */}
            <TouchableOpacity style={VideoStyle.upAndDownDPad}
              onPressIn={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.BACKWARD);
              }}
              onPressOut={() => {
                this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
              }}
            >
              <FontAwesome name="chevron-down" size={40} color="#fff" />
            </TouchableOpacity>

            {/* Drum/shoulder buttons. */}
            <View style={VideoStyle.drumFunctionContainer}>
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
                        <FontAwesome name="arrow-circle-up" size={40} color="#fff" />
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
                        <FontAwesome name="arrow-circle-down" size={40} color="#fff" />
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
                        <FontAwesome name="arrow-circle-up" size={40} color="#fff" />
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
                        <FontAwesome name="arrow-circle-down" size={40} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

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
                        <FontAwesome name="rotate-left" size={40} color="#fff" />
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
                        <FontAwesome name="rotate-right" size={40} color="#fff" />
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
                        <FontAwesome name="rotate-left" size={40} color="#fff" />
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
                        <FontAwesome name="rotate-right" size={40} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Left and right wheel buttons. */}
            <View style={{ flex: 2, flexDirection: 'row'}}>
              {/* Left button. */}
              <TouchableOpacity style={VideoStyle.upAndDownDPad}
                onPressIn={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.LEFT);
                }}
                onPressOut={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
                }}
              >
                <FontAwesome name="chevron-left" size={40} color="#fff" />
              </TouchableOpacity>

              {/* Right button. */}
              <TouchableOpacity style={VideoStyle.upAndDownDPad}
                onPressIn={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.RIGHT);
                }}
                onPressOut={() => {
                  this.sendOperation(Robot.WHEELS, WheelOperation.STOP);
                }}
              >
                <FontAwesome name="chevron-right" size={40} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5D6061',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewContainer: {
    flex: 1,
    alignContent: 'center',
    width: "100%",
    height: '100%',
  },
  webView: {
    flex: 1,
    marginLeft: -96,
    marginRight: -91,
    marginTop: -70,
    marginBottom: -70,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignContent: 'center',
    zIndex: 10,
    flex: 1,
    elevation: 3,
    opacity: 0.8,
    width: '100%',
    paddingHorizontal: 70,
    shadowColor: 'transparent',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  overlayedMenu: {
    flex: 1,
    position: 'absolute',
    top: 5,
    flexDirection: 'row',
    width: '100%',
    height: '17%',
    justifyContent: 'center',
    alignContent: 'center',
    zIndex: 10,
  },
});