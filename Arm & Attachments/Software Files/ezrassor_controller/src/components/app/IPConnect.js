import React from 'react';
import {
  Text,
  View,
  Image,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ControllerStyle from '../../styles/controller';
import * as Font from 'expo-font';
import logo from '../../../assets/fsiLogo.png';
import arrowright from '../../../assets/arrowri.png';
import LoadingAnimation from './LoadingAnimation';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { findRovers, isIpReachable } from '../../functionality/connection';
import { normalize } from '../../functionality/display';
import { getWebLayout } from '../../functionality/web-layout';

const DEFAULT_IP = '192.168.10.3:5000';

/**
 * React component for the connect-to-ip screen.
 */
export default class IPConnect extends React.Component {

  constructor(props) {
    super(props);

    const initialSize = Dimensions.get('window');
    this.state = {
      viewportWidth: initialSize.width,
      viewportHeight: initialSize.height,
      isLoading: true,
      ip: null,
      isFindingRover: false,
      discoveryMessage: '',
      discoveredRovers: [],
      discoveryModalVisible: false,
    };

    this.animation = React.createRef(null);
  }

  async componentDidMount() {
    this.dimensionSubscription = Dimensions.addEventListener('change', ({ window }) => {
      this.setState({ viewportWidth: window.width, viewportHeight: window.height });
    });
    await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });

    this.animation = React.createRef(null);
    this.animation.current?.reset();

    this.setState({ isLoading: false });
    this.getIpFromStorage();

    this._unsubscribe = this.props.navigation.addListener('focus', () => {
      this.getIpFromStorage();
      this.animation.current?.reset();
    });

    this._blur = this.props.navigation.addListener('blur', () => {
      this.animation.current?.reset();
    });
  }

  async componentWillUnmount() {
    this.dimensionSubscription?.remove();
    this.animation = React.createRef(null);
    this.animation.current?.reset();

    this._unsubscribe();
    this._blur();
  }

  /**
   * Set `this.state.ip` to the specified IP + port.
   * 
   * @param {string} ip IP + port.
   */
  changeIP(ip) {
    this.setState({ ip });
  }

  /**
   * Set `myIp` in storage to `this.state.ip`.
   */
  async setIpInStorage() {
    try {
      await AsyncStorage.setItem('myIp', this.state.ip);
    } catch (error) {
      // Error saving data. Log error, but do nothing otherwise.
      console.log(error);
    }
  }

  /**
   * Load `myIp` from storage into `this.state.ip`.
   */
  async getIpFromStorage() {
    try {
      const ip = await AsyncStorage.getItem('myIp');

      if (this.state.ip == null) {
        let selectedIp = ip;
        if (selectedIp == null) {
          selectedIp = DEFAULT_IP;
        }
        this.setState({ ip: selectedIp });
      }
    } catch (error) {
      // Error retrieving data. Do nothing.
    }
  }

  /**
   * Check if we can connect to the ip address at `this.state.ip`. Then redirect to either
   * a "can connect" or "cannot connect" screen.
   */
  async redirectBasedOnReachability() {
    const timeoutTime = 5000;

    console.log('In redirectBasedOnReachability with IP: ' + this.state.ip);

    if (await isIpReachable(this.state.ip, timeoutTime)) {
      this.setIpInStorage();
      this.props.navigation.navigate('Connection Status Screen', { screen: 'roverConnected' });
    } else {
      this.props.navigation.navigate('Connection Status Screen', { screen: 'roverDisconnected' });
    }
  }

  /** Find available rover services without relying on the manual IP field. */
  async findRover() {
    if (this.state.isFindingRover) {
      return;
    }

    this.setState({
      isFindingRover: true,
      discoveryMessage: 'Searching the local network for RE-RASSOR…',
      discoveredRovers: [],
      discoveryModalVisible: true,
    });

    const rovers = await findRovers();
    let discoveryMessage = 'No rover found on the RE-RASSOR network.';
    if (rovers.length > 0) {
      let suffix = '';
      if (rovers.length !== 1) {
        suffix = 's';
      }
      discoveryMessage = `${rovers.length} rover${suffix} found.`;
    }
    this.setState({
      isFindingRover: false,
      discoveryMessage,
      discoveredRovers: rovers,
      discoveryModalVisible: true
    });
  }

  async selectDiscoveredRover(ip) {
    this.setState({ ip, discoveryModalVisible: false });
    await AsyncStorage.setItem('myIp', ip);
  }

  renderDiscoveryModalContent() {
    if (this.state.isFindingRover) {
      return (
        <Text style={ControllerStyle.noRoversText}>
          Scanning the local Wi-Fi network for available RE-RASSOR rovers…
        </Text>
      );
    }

    if (this.state.discoveredRovers.length > 0) {
      return this.state.discoveredRovers.map((ip) => (
        <TouchableOpacity
          key={ip}
          style={ControllerStyle.discoveredRoverRow}
          onPress={() => this.selectDiscoveredRover(ip)}
        >
          <Text style={ControllerStyle.discoveredRoverText}>RE-RASSOR ({ip})</Text>
          <Text style={ControllerStyle.discoveredRoverUseText}>USE</Text>
        </TouchableOpacity>
      ));
    }

    return (
      <Text style={ControllerStyle.noRoversText}>
        No rover was found. Confirm that this device and the rover are on the same Wi-Fi network.
      </Text>
    );
  }

  renderWebConnect() {
    let modalTitle = 'AVAILABLE ROVERS';
    let findRoverButtonText = 'FIND ROVER';
    if (this.state.isFindingRover) {
      modalTitle = 'FINDING ROVER IP ADDRESS';
      findRoverButtonText = 'SEARCHING…';
    }

    const isNarrow = this.state.viewportWidth < 620;
    let titleFontSize = 42;
    let actionDirection = 'row';
    if (isNarrow) {
      titleFontSize = 27;
      actionDirection = 'column';
    }

    let cardPadding = 24;
    let messageSize = 25;
    let inputSize = 22;
    let buttonFlex = 1;
    let findButtonWidth = '62%';
    if (isNarrow) {
      cardPadding = 16;
      messageSize = 20;
      inputSize = 17;
      buttonFlex = 0;
      findButtonWidth = '100%';
    }

    return (
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: '#2E3030' }}
        contentContainerStyle={{
          flexGrow: 1,
          minHeight: this.state.viewportHeight,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 28
        }}
      >
        <Modal
          transparent
          animationType="fade"
          visible={this.state.discoveryModalVisible}
          onRequestClose={() => this.setState({ discoveryModalVisible: false })}
        >
          <View style={ControllerStyle.discoveryModalBackdrop}>
            <View style={[ControllerStyle.discoveryModalCard, { width: '100%', maxWidth: 620 }]}>
              <Text style={ControllerStyle.discoveryModalTitle}>{modalTitle}</Text>
              {this.renderDiscoveryModalContent()}
              <TouchableOpacity
                style={ControllerStyle.discoveryModalCloseButton}
                onPress={() => this.setState({ discoveryModalVisible: false })}
              >
                <Text style={ControllerStyle.discoveryModalCloseText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <StatusBar backgroundColor="#2E3030" barStyle="light-content" />
        <View style={{ width: '100%', maxWidth: 650, alignItems: 'center' }}>
          <View style={{
            width: '100%',
            minHeight: 84,
            backgroundColor: '#4a4d4e',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 17,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18
          }}>
            <Text style={{
              fontFamily: 'NASA', color: '#fff',
              textAlign: 'center', fontSize: titleFontSize
            }}>RE-RASSOR Connect</Text>
          </View>

          <View style={{
            width: '100%',
            borderRadius: 14,
            backgroundColor: '#3a3d3d',
            borderColor: '#646a6a',
            borderWidth: 1,
            padding: cardPadding,
            alignItems: 'center'
          }}>
            <Text style={{
              fontFamily: 'NASA',
              fontSize: messageSize,
              color: '#fff',
              textAlign: 'center',
              marginBottom: 12
            }}>Connect to your RE-RASSOR rover</Text>

            <TextInput
              accessibilityLabel="Rover address"
              style={{
                width: '100%',
                height: 52,
                backgroundColor: '#2E3030',
                borderColor: '#939797',
                borderWidth: 1,
                borderRadius: 5,
                color: '#fff',
                fontFamily: 'NASA',
                fontSize: inputSize,
                textAlign: 'center',
                paddingHorizontal: 8,
                marginBottom: 14
              }}
              onChangeText={(text) => this.changeIP(text)}
              value={this.state.ip || ''}
              placeholder="192.168.10.3:5000"
              placeholderTextColor="#aeb5b5"
              selectionColor="#fff"
            />

            <TouchableOpacity
              disabled={this.state.isFindingRover}
              style={{
                minHeight: 46,
                width: findButtonWidth,
                borderWidth: 2,
                borderColor: '#fff',
                borderRadius: 7,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8
              }}
              onPress={() => this.findRover()}
            >
              <Text style={{ fontFamily: 'NASA', fontSize: 19, color: '#fff' }}>
                {findRoverButtonText}
              </Text>
            </TouchableOpacity>

            <Text style={{
              fontFamily: 'NASA', fontSize: 13, color: '#d7dddd',
              textAlign: 'center', minHeight: 38, marginBottom: 14
            }}>
              {this.state.discoveryMessage || 'Find Rover checks the supported local rover addresses.'}
            </Text>

            <View style={{
              flexDirection: actionDirection,
              width: '100%',
              alignItems: 'stretch',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => this.redirectBasedOnReachability()}
                style={{
                  flex: buttonFlex,
                  minHeight: 56,
                  backgroundColor: '#fff',
                  borderRadius: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 10
                }}
              >
                <Text style={{ fontFamily: 'NASA', fontSize: 20, color: '#202323' }}>CONNECT</Text>
                <Image source={arrowright} resizeMode="contain" style={{ width: 24, height: 24 }} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open controls offline"
                onPress={() => this.props.navigation.navigate('Controller Screen', { offlineMode: true })}
                style={{
                  flex: buttonFlex,
                  minHeight: 56,
                  backgroundColor: '#fff',
                  borderRadius: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 10
                }}
              >
                <Text style={{ fontFamily: 'NASA', fontSize: 17, color: '#202323', textAlign: 'center' }}>
                  OPEN CONTROLS OFFLINE
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 20,
            gap: 16
          }}>
            <Image source={logo} resizeMode="contain" style={{ width: 112, height: 60 }} />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => this.props.navigation.navigate('Connection Help Screen')}
              style={{
                backgroundColor: '#fff', borderRadius: 7,
                minHeight: 48, minWidth: 116,
                paddingHorizontal: 20,
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Text style={{ fontFamily: 'NASA', fontSize: 24, color: '#202323' }}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    );
  }

  render() {
    // I.e., don't do full render if font is still loading...
    if (this.state.isLoading) {
      return <View style={{ flex: 1, backgroundColor: '#5D6061' }} />;
    }

    if (Platform.OS === 'web') {
      return this.renderWebConnect();
    }

    const webLayout = getWebLayout(this.state.viewportWidth, this.state.viewportHeight, Platform.OS);
    let messageFontSize = normalize(30, 1.8);
    let inputFontSize = normalize(38, 1.2);
    let animationStyle = { position: 'absolute', width: 300, height: 300, bottom: 5 };
    let modalTitle = 'AVAILABLE ROVERS';
    let findRoverButtonText = 'FIND ROVER';
    if (this.state.isFindingRover) {
      modalTitle = 'FINDING ROVER IP ADDRESS';
      findRoverButtonText = 'SEARCHING…';
    }
    if (webLayout.isWeb) {
      messageFontSize = webLayout.messageFontSize;
      inputFontSize = webLayout.ipFontSize;
      animationStyle = { width: 88, height: 42, marginVertical: 3 };
    }

    return (
      <KeyboardAwareScrollView
        style={webLayout.isWeb && { flex: 1, backgroundColor: '#2E3030' }}
        contentContainerStyle={[
          ControllerStyle.keyboardAwareScrollView,
          webLayout.isWeb && { flexGrow: 1, minHeight: this.state.viewportHeight }
        ]}
      >
        <View style={[
          ControllerStyle.screenLayout,
          webLayout.isWeb && { minHeight: this.state.viewportHeight, height: undefined, justifyContent: 'flex-start', paddingTop: webLayout.outerPadding, paddingHorizontal: 12 }
        ]}>

          <Modal
            transparent={true}
            animationType="fade"
            visible={this.state.discoveryModalVisible}
            onRequestClose={() => this.setState({ discoveryModalVisible: false })}
          >
            <View style={ControllerStyle.discoveryModalBackdrop}>
              <View style={[
                ControllerStyle.discoveryModalCard,
                webLayout.isWeb && { width: '100%', maxWidth: 650 },
                webLayout.isCompact && { padding: 16 }
              ]}>
                <Text style={ControllerStyle.discoveryModalTitle}>
                  {modalTitle}
                </Text>
                {this.renderDiscoveryModalContent()}
                <TouchableOpacity
                  style={ControllerStyle.discoveryModalCloseButton}
                  onPress={() => this.setState({ discoveryModalVisible: false })}
                >
                  <Text style={ControllerStyle.discoveryModalCloseText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <StatusBar backgroundColor="#2E3030" barStyle="dark-content" />

          {/* Title container. */}
          <View style={[
            ControllerStyle.title,
            webLayout.isWeb && { width: '100%', maxWidth: 840, height: undefined, minHeight: webLayout.titleHeight, paddingVertical: 8 }
          ]}>
            <Text adjustsFontSizeToFit={true} numberOfLines={2} style={[
              ControllerStyle.titleText,
              webLayout.isWeb && { fontSize: webLayout.titleFontSize }
            ]}>
              RE-RASSOR Connect
            </Text>
          </View>

          {/* Body container. */}
          <View style={[
            ControllerStyle.connectionBody,
            webLayout.isWeb && { flexDirection: 'column', flexGrow: 1, flex: 0, justifyContent: 'center', paddingTop: 18, paddingBottom: 16, gap: 14 }
          ]}>

            {/* FSI logo. */}
            <Image source={logo} resizeMode="contain" style={[
              ControllerStyle.fsiLogo,
              ControllerStyle.connectionFsiLogo,
              webLayout.isWeb && { width: webLayout.logoWidth, height: 66, position: 'relative', left: 0, right: 0, bottom: 0, alignSelf: 'center', backgroundColor: 'transparent' }
            ]} />

            {/* Inner-body container. */}
            <View style={[
              ControllerStyle.containerTwo,
              ControllerStyle.connectionCard,
              webLayout.isWeb && { width: '100%', maxWidth: 620, height: undefined, minHeight: 0, flexGrow: 0, paddingHorizontal: webLayout.cardPadding, paddingVertical: 24, alignSelf: 'center' }
            ]}>

              {/* Message to user. */}
              <Text
                adjustsFontSizeToFit={true}
                numberOfLines={2}
                style={{
                  display: 'flex',
                  alignSelf: 'center',
                  fontFamily: 'NASA',
                  margin: 10,
                  fontSize: messageFontSize,
                  textAlign: 'center',
                  color: '#fff'
                }}
              >
                Connect to your RE-RASSOR rover
              </Text>

              {/* Loading dots animation. */}
              <LoadingAnimation
                ref={this.animation}
                autoPlay={false}
                pointerEvents="none"
                style={animationStyle}
                resizeMode="cover"
                source={require('../../../assets/loading.json')}
              />

              {/* Text input for IP + port. */}
              <TextInput
                ref="myInput"
                fontSize={inputFontSize}
                style={[
                  ControllerStyle.ipInputBox,
                  ControllerStyle.connectionIpInput,
                  webLayout.isWeb && { width: '100%', maxWidth: 520, height: 56, fontSize: webLayout.ipFontSize, paddingHorizontal: 8, marginVertical: 10 }
                ]}
                onChangeText={(text) => this.changeIP(text)}
                value={this.state.ip}
                marginVertical={8}
                disableFullscreenUI={true}
                selectionColor={'white'}
                placeholder="192.168.10.3:5000"
                placeholderTextColor="#aeb5b5"
              />

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={this.state.isFindingRover}
                style={[
                  ControllerStyle.findRoverButton,
                  this.state.isFindingRover && ControllerStyle.findRoverButtonDisabled,
                  webLayout.isWeb && { minHeight: 48, width: webLayout.roverButtonWidth }
                ]}
                onPress={() => this.findRover()}
              >
                <Text style={ControllerStyle.findRoverButtonText}>
                  {findRoverButtonText}
                </Text>
              </TouchableOpacity>

              <Text
                accessibilityLiveRegion="polite"
                style={ControllerStyle.discoveryMessage}
              >
                {this.state.discoveryMessage || 'Find Rover checks the supported local rover addresses.'}
              </Text>

              <View style={[
                ControllerStyle.connectionActionRow,
                webLayout.isWeb && { width: '100%', height: undefined, flexDirection: webLayout.buttonDirection, gap: 10, alignItems: 'center', marginTop: 12 }
              ]}>
                {/* Connect button. */}
                <TouchableOpacity
                  activeOpacity={0.95}
                  backgroundColor="#FFFFFF"
                  style={[
                    ControllerStyle.connectButton,
                    ControllerStyle.primaryConnectButton,
                    webLayout.isWeb && { width: webLayout.primaryButtonWidth, minHeight: 56, height: 56, alignSelf: 'center', marginBottom: 0 }
                  ]}
                  onPress={() => {
                    this.animation.current?.play();
                    this.redirectBasedOnReachability();
                  }}
                >
                  <Text style={[ControllerStyle.connectButtonText, ControllerStyle.connectionConnectText]}>
                    CONNECT
                  </Text>
                  <Image source={arrowright} style={ControllerStyle.arrowRight} />
                </TouchableOpacity>

                {/* Kept beside Connect so it is always visible on short landscape screens. */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  accessibilityLabel="Open control interface in offline preview mode"
                  style={[
                    ControllerStyle.offlinePreviewButton,
                    webLayout.isWeb && { width: webLayout.secondaryButtonWidth, minHeight: 56, height: 56 }
                  ]}
                  onPress={() => this.props.navigation.navigate('Controller Screen', { offlineMode: true })}
                >
                  <Text style={ControllerStyle.offlinePreviewButtonText}>
                    OPEN CONTROLS{`\n`}OFFLINE
                  </Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* Help button. */}
            <TouchableOpacity
              activeOpacity={0.95}
              style={[
                ControllerStyle.buttonContainer,
                ControllerStyle.connectionHelpButton,
                webLayout.isWeb && { position: 'relative', right: 0, left: 0, bottom: 0, alignSelf: 'center', width: 140, height: 54, justifyContent: 'center' }
              ]}
              onPress={() => {
                this.props.navigation.navigate('Connection Help Screen');
              }}
            >
              <Text adjustsFontSizeToFit={true} numberOfLines={1} style={[ControllerStyle.buttonText, ControllerStyle.connectionHelpButtonText]}>
                Help
              </Text>
            </TouchableOpacity>

          </View>

        </View>
      </KeyboardAwareScrollView>
    );
  }
}