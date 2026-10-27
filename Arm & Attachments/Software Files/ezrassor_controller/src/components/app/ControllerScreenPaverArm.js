import React from 'react';
import Modal from './ControllerModal';
import EZRASSOR from '../../api/ezrassor-service-paver-arm' 
import ControllerStyle from '../../styles/controllerPaverArm';
import {Robot, Operation} from '../../enumerations/robot-commands-paver-arm';
import FadeInView from "../../components/app/FadeInView";

import {
  Text,
  View,
  Image,
  ImageBackground,
  TouchableHighlight,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font  from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWebLayout } from '../../functionality/web-layout';

const DEFAULT_BRIDGE_PORT = '3000';

function defaultBridgeHost(roverIp) {
  if (!roverIp) {
    return '127.0.0.1:' + DEFAULT_BRIDGE_PORT;
  }
  const stripped = roverIp.replace(/^https?:\/\//, '').split('/')[0];
  const hostName = stripped.split(':')[0];
  return hostName + ':' + DEFAULT_BRIDGE_PORT;
}




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
      isDefault: true,
      isPlateSelected: false,
      isShoulderSelected: false,
      isForearmSelected: false,
      isEndEffectorSelected: false,
      offlineMode: false,
      bridgeIp: '127.0.0.1:3000',
      bridgeReady: false,
      baseAvailable: false,
      bridgeMessage: 'CHECK BRIDGE before moving',
      bridgeModalVisible: false,
      activeMotion: '',
      screenWidth: Dimensions.get('window').width,
      screenHeight: Dimensions.get('window').height,
    }; 

    this.EZRASSOR = new EZRASSOR(this.state.ip);
  }

  async componentDidMount() {
    await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });

    const routeParams = this.props.route.params || {};
    let roverIp = routeParams.currentIp;
    if (!roverIp) {
      roverIp = await AsyncStorage.getItem('myIp');
    }
    let bridgeIp = await AsyncStorage.getItem('armBridgeIp');
    if (!bridgeIp) {
      bridgeIp = defaultBridgeHost(roverIp);
    }
    this.EZRASSOR.host = bridgeIp;
    this.setState({
      isLoading: false,
      ip: roverIp || '',
      bridgeIp,
      offlineMode: routeParams.offlineMode === true
    });
    this._blur = this.props.navigation.addListener('blur', () => this.releaseActiveMotion());

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      this.onVisibilityChange = () => {
        if (document.hidden) {
          this.releaseActiveMotion();
        }
      };
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  componentWillUnmount() {
    this.releaseActiveMotion();
    if (this._blur) {
      this._blur();
    }
    if (this.onVisibilityChange && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  async checkBridge() {
    const bridgeIp = this.state.bridgeIp.trim();
    this.EZRASSOR.host = bridgeIp;
    this.setState({ bridgeReady: false, bridgeMessage: 'CHECKING BRIDGE...' });
    try {
      let url = bridgeIp;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      const response = await fetch(url.replace(/\/$/, '') + '/health');
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      const status = await response.json();
      if (!status.armOpen || !status.handOpen) {
        throw new Error('Arm or hand Arduino is disconnected.');
      }
      await AsyncStorage.setItem('armBridgeIp', bridgeIp);
      let bridgeMessage = 'ARM + HAND CONNECTED (BASE UNAVAILABLE)';
      if (status.wheelsOpen) {
        bridgeMessage = 'ARM, HAND, WHEELS CONNECTED';
      }
      this.setState({
        bridgeReady: true,
        baseAvailable: !!status.wheelsOpen,
        offlineMode: false,
        bridgeModalVisible: false,
        bridgeMessage
      });
    } catch (error) {
      this.setState({ bridgeReady: false, bridgeMessage: 'BRIDGE UNAVAILABLE: ' + error.message });
    }
  }

  async sendOperation(part, operation) {
    if (!this.state.bridgeReady && operation !== Operation.STOP) {
      return;
    }
    try {
      await this.EZRASSOR.executeRobotCommand(part, operation);
      if (operation === Operation.STOP && part === Robot.ALL) {
        this.setState({ activeMotion: '', bridgeMessage: 'STOP SENT' });
      }
    } catch (error) {
      this.setState({ bridgeReady: false, activeMotion: '', bridgeMessage: 'COMMAND FAILED / STOP NOT CONFIRMED: ' + error.message });
    }
  }

  pressMotion(part, operation, label) {
    if (!this.state.bridgeReady || (part === Robot.PLATE && !this.state.baseAvailable)) {
      return;
    }
    this.selectArmPart(part);
    if (this.activePart && (this.activePart !== part || this.activeAction !== operation)) {
      this.sendOperation(this.activePart, Operation.STOP);
    }
    this.activePart = part;
    this.activeAction = operation;
    this.setState({ activeMotion: label, bridgeMessage: 'MOVING: ' + label });
    this.sendOperation(part, operation);
  }

  releaseActiveMotion() {
    this.releaseMotion(this.activePart);
  }

  releaseMotion(part) {
    if (!part || part !== this.activePart) {
      return;
    }
    this.activePart = null;
    this.activeAction = null;
    this.setState({ activeMotion: '', bridgeMessage: 'STOP REQUESTED' });
    this.sendOperation(part, Operation.STOP);
  }

  emergencyStop() {
    this.activePart = null;
    this.activeAction = null;
    this.setState({ activeMotion: '', bridgeMessage: 'SENDING ARM STOP...' });
    this.sendOperation(Robot.ALL, Operation.STOP);
  }

  setAutonomyModalVisible(visible) {
    this.setState({ autonomyModalVisible: visible });
  }

  setInfoModalVisible(visible) {
    this.setState({ infoModalVisible: visible });
  }

  setBugModalVisible(visible) {
    this.setState({ bugModalVisible: visible });
  }

  setIPModalVisible(visible){
    this.setState({ipModal: visible});
  }

  setXYModalVisible(visible){
    this.setState({xyModal:visible});
  }

  changeXY(combined){
    this.setState({xy:combined}, () => {
      this.EZRASSOR.setCoordinate(this.state.xy);
    });
  }

  changeIP(text) {
    // Rover address and arm-bridge address are configured independently.
    this.setState({ ip: text });
  }

  getArmPanelFlex() {
    if (this.getBodyDirection() === 'row') {
      return 1;
    }
    return 0;
  }

  getArmPanelWidth() {
    if (this.getBodyDirection() === 'row') {
      return undefined;
    }
    return '100%';
  }

  getArmBodyMinimumHeight() {
    if (this.getBodyDirection() === 'column') {
      return 800;
    }
    return 510;
  }

  getCameraPanelMinimumHeight() {
    if (this.getBodyDirection() === 'column') {
      return 245;
    }
    return 520;
  }

  getBodyDirection() {
    if (Platform.OS === 'web' && this.state.screenWidth < 800) {
      return 'column';
    }
    if (this.state.screenWidth >= 880) {
      return 'row';
    }
    return 'column';
  }

  renderDefaultArm = () => {   
    if (this.state.isDefault) {
      return <Image source={require('../../../assets/PaverArmDefault.png')} style={{width:"100%", height:"100%", resizeMode:"contain"}}/>;
    } else {
      return null;
    }
  };

  renderPlateArm = () => {    
    if (this.state.isPlateSelected) {
      return <Image source={require('../../../assets/PaverArmBase.png')} style={{width:"100%", height:"100%", resizeMode:"contain"}}/>;
    } else {
      return null;
    }
  };

  renderShoulderArm = () => {    
    if (this.state.isShoulderSelected) {
      return <Image source={require('../../../assets/PaverArmShoulder.png')} style={{width:"100%", height:"100%", resizeMode:"contain"}}/>;
    } else {
      return null;
    }
  };

  renderForearmArm = () => {    
    if (this.state.isForearmSelected) {
      return <Image source={require('../../../assets/PaverArmForearm.png')} style={{width:"100%", height:"100%", resizeMode:"contain"}}/>;
    } else {
      return null;
    }
  };

  renderEndEffectorArm= () => {    
    if (this.state.isEndEffectorSelected) {
      return <Image source={require('../../../assets/PaverArmWrist.png')} style={{width:"100%", height:"100%", resizeMode:"contain"}}/>;
    } else {
      return null;
    }
  };
  
  selectArmPart(part) {
    this.setState({
      isDefault: false,
      isPlateSelected: part === Robot.PLATE,
      isShoulderSelected: part === Robot.SHOULDER,
      isForearmSelected: part === Robot.FOREARM,
      isEndEffectorSelected: part === Robot.ENDEFFECTOR,
    });
  }

  sendJointOperation(part, operation) {
    this.selectArmPart(part);
    this.sendOperation(part, operation);
  }

  getSelectedArmVisual() {
    if (this.state.isPlateSelected) return require('../../../assets/PaverArmBase.png');
    if (this.state.isShoulderSelected) return require('../../../assets/PaverArmShoulder.png');
    if (this.state.isForearmSelected) return require('../../../assets/PaverArmForearm.png');
    if (this.state.isEndEffectorSelected) return require('../../../assets/PaverArmWrist.png');
    return require('../../../assets/PaverArmDefault.png');
  }

  renderJointControl(label, part, positiveLabel, negativeLabel, positiveIcon, negativeIcon, textStyle) {
    return (
      <View style={ControllerStyle.PaverArmBaseButton}>
        <Text style={ControllerStyle.buttonTextCenter}>{label}</Text>
        <View style={{flex: 2, flexDirection: 'row'}}>
          <View style={ControllerStyle.buttonBackground}>
            <TouchableOpacity
              disabled={!this.state.bridgeReady || (part === Robot.PLATE && !this.state.baseAvailable)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              onPressIn={() => this.pressMotion(part, Operation.POSITIVE, label + ' ' + positiveLabel)}
              onPressOut={() => this.releaseMotion(part)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={textStyle}>{positiveLabel}</Text>
              <FontAwesome style={ControllerStyle.buttonImage} name={positiveIcon} size={35} color='#fff'/>
            </TouchableOpacity>
          </View>

          <View style={ControllerStyle.buttonBackground}>
            <TouchableOpacity
              disabled={!this.state.bridgeReady || (part === Robot.PLATE && !this.state.baseAvailable)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              onPressIn={() => this.pressMotion(part, Operation.NEGATIVE, label + ' ' + negativeLabel)}
              onPressOut={() => this.releaseMotion(part)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={textStyle}>{negativeLabel}</Text>
              <FontAwesome style={ControllerStyle.buttonImage} name={negativeIcon} size={35} color='#fff'/>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  render() {

    // Loading font
    if (this.state.isLoading) {
      return (
        <View style={{flex: 1, backgroundColor: '#5D6061'}}/>
      );
    }

    const webLayout = getWebLayout(this.state.screenWidth, this.state.screenHeight, Platform.OS);

    return ( 
      <View style={ControllerStyle.container} onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        const height = event.nativeEvent.layout.height;
        if (Math.abs(width - this.state.screenWidth) > 10 || Math.abs(height - this.state.screenHeight) > 10) {
          this.setState({ screenWidth: width, screenHeight: height });
        }
      }}> 
        <StatusBar hidden />

        {/* Info Popup Modal*/}
        <Modal
          style={ControllerStyle.modalViewContainer}
          isVisible={this.state.infoModalVisible}
          onSwipeComplete={() => this.setInfoModalVisible(false)}
          swipeDirection='down'
          onRequestClose={() => this.setInfoModalVisible(!this.state.infoModalVisible)}>
    
          <TouchableHighlight style={{ justifyContent: 'center' }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 25}}>
                <Text style={ControllerStyle.textLarge}>Controller Help</Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginHorizontal:"0.5%"}}>
                <View style={{ flex: 1}} >
                  <FontAwesome style={{textAlign:'center'}} name="wifi" size={30} color='#fff'/>
                  <Text style={ControllerStyle.textSmallCenter}> 
                    Connects to the server with input string: {'\n'} 
                    IP : PORT
                  </Text>
                </View> 

                {/* Vertical separating bar. */}
                <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

                <View style={{ flex: 1}} >
                <FontAwesome style={{textAlign:'center'}} name="arrow-left" size={30} color='#fff'/>
                  <Text style={ControllerStyle.textSmallCenter}> 
                    Back to homescreen
                  </Text>
                </View>

                {/* Vertical separating bar. */}
                <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

                <View style={{ flex: 1}} >
                  <FontAwesome style={{textAlign:'center'}} name="stop-circle-o" size={30} color='#fff'/>
                    <Text style={ControllerStyle.textSmallCenter}> 
                     Stops arm and gripper. Rover STOP depends on port setup
                    </Text>
                  </View>

                {/* Vertical separating bar. */}
                <View style={{ flex: 0.01, borderRadius: 2, backgroundColor: "#2e3030", marginHorizontal:"0.5%" }}></View>

                <View style={{ flex: 1}} >
                <MaterialCommunityIcons style={{textAlign:'center'}} name="robot" size={32} color='#fff'/>
                  <Text style={ControllerStyle.textSmallCenter}> 
                    Opens autonomy functions
                  </Text>
                </View>
              </View>
            </View>
          </TouchableHighlight>
        </Modal>        

        <FadeInView style={[
          ControllerStyle.headerContainer,
          webLayout.isWeb && { flex: 0, flexShrink: 0, minHeight: 76, width: '98%', maxWidth: 1500, alignSelf: 'center' },
          webLayout.isCompact && { minHeight: 106, padding: 6 }
        ]}>
          {/* Info button */}
          <TouchableOpacity style={{ flex: 1, padding: 3}} onPress={() => this.setInfoModalVisible(true)}>
            <FontAwesome 
              name="info-circle" 
              size={35} color='#fff'/>
          </TouchableOpacity>

          {/* Set-IP button. */}
          <TouchableOpacity
              style={{ flex: 1, padding: 1 }}
              onPress={() => this.setState({ bridgeModalVisible: true })}>
              <FontAwesome 
                name="wifi" 
                size={30} color="#fff" />
          </TouchableOpacity>

          <Text style={[
            ControllerStyle.textSmall,
            webLayout.isWeb && { flexShrink: 1, textAlign: 'center', fontSize: 20 },
            webLayout.isCompact && { fontSize: 16 }
          ]}>RE-RASSOR Paver Arm Controller</Text>

          {/* BACK button to go back to the controller screen */}
          <TouchableOpacity
            style={{ flex: 1, padding: 3 }}
            onPress={() => { this.releaseActiveMotion(); this.props.navigation.replace("Controller Screen", { currentIp: this.state.ip, offlineMode: this.state.offlineMode }); }}
            >
              <FontAwesome
                style={{ marginLeft: 'auto' }}
                name="arrow-left"
                size={30}
                color="#fff" />
          </TouchableOpacity>
          
          {/* Stop button */}
          <TouchableOpacity style={{ flex: 1, padding: 3}} onPress={() => this.emergencyStop()}>
            <FontAwesome name="stop-circle-o" style={{marginLeft: "auto"}} size={35} color="#ffb3b3"/>
            <Text style={{ fontSize: 10, color: '#fff', textAlign: 'right' }}>ARM STOP</Text>
          </TouchableOpacity>

        </FadeInView>


        <Modal
          style={ControllerStyle.modalViewContainer}
          isVisible={this.state.bridgeModalVisible}
          onRequestClose={() => this.setState({ bridgeModalVisible: false })}>
          <View style={{ padding: 24 }}>
            <Text style={ControllerStyle.textSmall}>ARM BRIDGE IP:PORT</Text>
            <TextInput
              accessibilityLabel="Arm bridge address"
              value={this.state.bridgeIp}
              onChangeText={(bridgeIp) => this.setState({ bridgeIp, bridgeReady: false })}
              autoCapitalize="none"
              style={ControllerStyle.ipInputBoxMedium}
            />
            <TouchableOpacity style={ControllerStyle.modalButton} onPress={() => this.checkBridge()}>
              <Text style={ControllerStyle.textSmall}>CHECK BRIDGE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 14, alignItems: 'center' }} onPress={() => this.setState({ bridgeModalVisible: false })}>
              <Text style={ControllerStyle.textSmall}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </Modal>
        <View style={{ width: '100%', paddingHorizontal: 16, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e3030' }}>
          <Text style={{ color: '#fff', flex: 1, fontSize: 12 }}>{this.state.bridgeMessage}</Text>
          <TouchableOpacity onPress={() => this.checkBridge()} style={{ padding: 7, backgroundColor: '#5D6061', borderRadius: 5 }}>
            <Text style={{ color: '#fff', fontSize: 12 }}>CHECK BRIDGE</Text>
          </TouchableOpacity>
        </View>

        {/* Original arm graphics and controls, kept compact on wide browsers. */}
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            flexGrow: 1,
            width: '100%',
            maxWidth: 1330,
            alignSelf: 'center',
            paddingHorizontal: 12,
            paddingVertical: 12
          }}
        >
          <View style={{
            flexDirection: this.getBodyDirection(),
            alignItems: 'stretch',
            justifyContent: 'center',
            flexGrow: 1,
            minHeight: this.getArmBodyMinimumHeight(),
            gap: 12
          }}>
            <ImageBackground
              source={this.getSelectedArmVisual()}
              resizeMode="contain"
              imageStyle={ControllerStyle.armControlBackgroundImage}
              style={[
                ControllerStyle.armControlColumn,
                {
                  flex: this.getArmPanelFlex(),
                  width: this.getArmPanelWidth(),
                  maxWidth: 610,
                  minHeight: 520,
                  marginLeft: 0,
                  alignSelf: 'center'
                }
              ]}
            >
              {this.renderJointControl('Base', Robot.PLATE, 'CW', 'CCW', 'rotate-right', 'rotate-left', ControllerStyle.mainButtonTextVertical)}
              {this.renderJointControl('Gripper', Robot.ENDEFFECTOR, 'Open', 'Close', 'arrow-up', 'arrow-down', ControllerStyle.mainButtonTextVertical)}
              {this.renderJointControl('Forearm', Robot.FOREARM, 'Up', 'Down', 'arrow-up', 'arrow-down', ControllerStyle.mainButtonTextVertical)}
              {this.renderJointControl('Shoulder', Robot.SHOULDER, 'Up', 'Down', 'arrow-up', 'arrow-down', ControllerStyle.mainButtonTextVertical)}
            </ImageBackground>
            <View style={[
              ControllerStyle.cameraPlaceholder,
              {
                flex: this.getArmPanelFlex(),
                width: this.getArmPanelWidth(),
                maxWidth: 650,
                minHeight: this.getCameraPanelMinimumHeight(),
                alignSelf: 'center',
                margin: 0
              }
            ]}>
              <FontAwesome name="video-camera" size={44} color="#9ba4a4" />
              <Text style={ControllerStyle.cameraPlaceholderTitle}>CAMERA FEED</Text>
              <Text style={ControllerStyle.cameraPlaceholderText}>Reserved for the arm camera</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }
}
