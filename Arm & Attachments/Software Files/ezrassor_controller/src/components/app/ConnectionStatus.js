import React from 'react';
import {
  Text,
  View,
  Image,
  StatusBar,
  Pressable
} from 'react-native';
import EZRASSOR from 'ezrassor-app/src/api/ezrassor-service';
import ControllerStyle from 'ezrassor-app/src/styles/controller';
import * as Font from 'expo-font';
import logo from 'ezrassor-app/assets/fsiLogo.png';
import checkmark from 'ezrassor-app/assets/checkmark.png';
import notconnected from 'ezrassor-app/assets/notconnected.png';
import wifi from 'ezrassor-app/assets/wifi.png';
import wifidisconnect from 'ezrassor-app/assets/wifidisconnect.png';
import * as SplashScreen from 'expo-splash-screen';
import { normalize } from '../../functionality/display';

/**
 * Modal-like React component displayed after user attempts to connect to an IP.
 * 
 * Multipurpose: Used both for successes and failures to connect.
 */
export default class ConnectionStatus extends React.Component {

  constructor(props) {
    SplashScreen.hideAsync();
    super(props);

    this.state = {
      screen: '',
      isLoading: true,
      ip: '',
      screens: {
        'roverConnected': {
          img: checkmark,
          text: 'SUCCESSFULLY CONNECTED TO ROVER',
          buttonTxt: 'OK',
          redirect: 'Controller Screen'
        },
        'roverDisconnected': {
          img: notconnected,
          text: 'CONNECTION TO ROVER FAILED',
          buttonTxt: 'RETRY',
          redirect: 'IPConnect Screen'
        },
        'wifiConnected': {
          img: wifi,
          text: 'WIFI SUCCESSFULLY RECONNECTED',
          buttonTxt: 'OK',
          redirect: 'Controller Screen'
        },
        'wifiDisconnected': {
          img: wifidisconnect,
          text: 'WIFI DISCONNECTED',
          buttonTxt: 'RETRY',
          function: ''
        }
      }
    };

    this.EZRASSOR = new EZRASSOR(this.state.ip);
  }

  async componentDidMount() {
    await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });

    this.setState({ screen: this.props.route.params.screen });
    this.setState({ isLoading: false });

    this._onfocus = this.props.navigation.addListener('focus', () => {
      this.setState({ screen: this.props.route.params.screen });
    });
  }

  async componentWillUnmount() {
    this._onfocus();
  }

  redirect() {
    const currScreen = this.state.screens[this.state.screen];
    if (currScreen.hasOwnProperty('redirect')) {
      this.props.navigation.navigate(currScreen.redirect);
    }
  }

  render() {
    // I.e., don't do full render if font is still loading...
    if (this.state.isLoading) {
      return <View style={{ backgroundColor: '#5D6061' }} />;
    }

    return (
      <View flex={1} >
        <StatusBar backgroundColor="#2E3030" barStyle="dark-content" />

        <View style={ControllerStyle.screenLayout} >

          {/* Title container. */}
          <View style={[ControllerStyle.title]}>
            <Text adjustsFontSizeToFit={true} numberOfLines={1} fontSize={normalize(70)} style={[ControllerStyle.titleText]}>
              RE-RASSOR Connect
            </Text>
          </View>

          {/* Body container. */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>

            {/* FSI logo. */}
            <Image source={logo} style={ControllerStyle.fsiLogo} />

            {/* Inner-body container. */}
            <View backgroundColor='#FFFFFF' width='60%' justifyContent='space-between' style={ControllerStyle.containerTwo}>
              <Image source={this.state.screens[this.state.screen].img} style={{ width: '15%', height: '15%', resizeMode: 'contain' }} marginTop={10} />

              {/* Message to user. */}
              <Text
                adjustsFontSizeToFit={true}
                numberOfLines={2}
                style={{
                  display: 'flex',
                  alignSelf: 'center',
                  fontFamily: 'NASA',
                  margin: 10,
                  fontSize: normalize(37),
                  textAlign: 'center',
                  color: 'black'
                }}
              >
                {this.state.screens[this.state.screen].text}
              </Text>

              {/* Retry/continue button. */}
              <Pressable
                adjustsFontSizeToFit={true}
                numberOfLines={1}
                title={this.state.screens[this.state.screen].buttonTxt}
                backgroundColor='#3F4142'
                style={[ControllerStyle.statusButton]}
                onPress={() => {
                  this.redirect();
                }}
              >
                <Text adjustsFontSizeToFit={true} numberOfLines={1} style={[ControllerStyle.statusButtonText]}>
                  {this.state.screens[this.state.screen].buttonTxt}
                </Text>
              </Pressable>

            </View>

            {/* Help button. */}
            <Pressable
              style={[ControllerStyle.buttonContainer]}
              onPress={() => {
                this.props.navigation.navigate("Connection Help Screen");
              }}
            >
              <Text adjustsFontSizeToFit={true} numberOfLines={1} style={[ControllerStyle.buttonText]}>
                Help
              </Text>
            </Pressable>

          </View>

        </View>
      </View>
    );
  }
}
