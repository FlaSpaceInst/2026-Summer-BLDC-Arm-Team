import React from 'react';
import {
  Text,
  View,
  Image,
  StatusBar,
  Pressable,
  ScrollView,
  Dimensions
} from 'react-native';
import ControllerStyle from '../../styles/controller';
import * as Font from 'expo-font';
import logo from '../../../assets/fsiLogo.png';
import checkmark from '../../../assets/checkmark.png';
import notconnected from '../../../assets/notconnected.png';
import wifi from '../../../assets/wifi.png';
import wifidisconnect from '../../../assets/wifidisconnect.png';
import * as SplashScreen from 'expo-splash-screen';

/**
 * Displays connection success and failure states using the original interface.
 * The content can scroll on short browser windows instead of shrinking.
 */
export default class ConnectionStatus extends React.Component {

  constructor(props) {
    super(props);

    const windowSize = Dimensions.get('window');

    this.state = {
      screen: this.getRouteScreen(),
      isLoading: true,
      viewportWidth: windowSize.width,
      viewportHeight: windowSize.height
    };

    this.screens = {
      roverConnected: {
        img: checkmark,
        text: 'SUCCESSFULLY CONNECTED TO ROVER',
        buttonTxt: 'OK',
        redirect: 'Controller Screen'
      },
      roverDisconnected: {
        img: notconnected,
        text: 'CONNECTION TO ROVER FAILED',
        buttonTxt: 'RETRY',
        redirect: 'IPConnect Screen'
      },
      wifiConnected: {
        img: wifi,
        text: 'WIFI SUCCESSFULLY RECONNECTED',
        buttonTxt: 'OK',
        redirect: 'Controller Screen'
      },
      wifiDisconnected: {
        img: wifidisconnect,
        text: 'WIFI DISCONNECTED',
        buttonTxt: 'RETRY',
        redirect: 'IPConnect Screen'
      }
    };

    this.isMountedScreen = false;
    this.focusSubscription = null;
    this.dimensionSubscription = null;
  }

  getRouteScreen() {
    const screen = this.props.route?.params?.screen;

    if (screen === 'roverConnected' || screen === 'roverDisconnected' ||
        screen === 'wifiConnected' || screen === 'wifiDisconnected') {
      return screen;
    }

    return 'roverDisconnected';
  }

  async componentDidMount() {
    this.isMountedScreen = true;

    this.focusSubscription = this.props.navigation.addListener('focus', () => {
      this.setState({ screen: this.getRouteScreen() });
    });

    // Dimensions updates when a desktop browser is resized.
    this.dimensionSubscription = Dimensions.addEventListener('change', ({ window }) => {
      if (this.isMountedScreen) {
        this.setState({
          viewportWidth: window.width,
          viewportHeight: window.height
        });
      }
    });

    try {
      await SplashScreen.hideAsync();
      await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });
    } catch (error) {
      console.warn('Could not load the connection status font:', error);
    } finally {
      if (this.isMountedScreen) {
        this.setState({ isLoading: false });
      }
    }
  }

  componentWillUnmount() {
    this.isMountedScreen = false;
    this.focusSubscription?.();
    this.dimensionSubscription?.remove();
  }

  redirect() {
    const currentScreen = this.screens[this.state.screen];

    if (currentScreen?.redirect) {
      this.props.navigation.navigate(currentScreen.redirect);
    }
  }

  render() {
    if (this.state.isLoading) {
      return <View style={ControllerStyle.statusScreenLoading} />;
    }

    const currentScreen = this.screens[this.state.screen];
    const isCompact = this.state.viewportWidth < 720;
    const isPhone = this.state.viewportWidth < 520;
    const isShort = this.state.viewportHeight < 560;

    return (
      <ScrollView
        style={ControllerStyle.statusScreenScroll}
        contentContainerStyle={[
          ControllerStyle.statusScreenContent,
          isCompact && ControllerStyle.statusScreenContentCompact,
          isShort && ControllerStyle.statusScreenContentShort
        ]}
      >
        <StatusBar backgroundColor="#2E3030" barStyle="light-content" />

        {/* Original RE-RASSOR title. */}
        <View style={[
          ControllerStyle.statusScreenTitle,
          isCompact && ControllerStyle.statusScreenTitleCompact,
          isShort && ControllerStyle.statusScreenTitleShort
        ]}>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit={true}
            style={[
              ControllerStyle.statusScreenTitleText,
              isCompact && ControllerStyle.statusScreenTitleTextCompact
            ]}
          >
            RE-RASSOR Connect
          </Text>
        </View>

        {/* Fixed-size content prevents icons and actions from being compressed. */}
        <View style={[
          ControllerStyle.statusScreenBody,
          isShort && ControllerStyle.statusScreenBodyShort
        ]}>
          <View style={[
            ControllerStyle.statusScreenCard,
            isCompact && ControllerStyle.statusScreenCardCompact,
            isShort && ControllerStyle.statusScreenCardShort
          ]}>
            <Image
              source={currentScreen.img}
              style={[
                ControllerStyle.statusScreenIcon,
                isShort && ControllerStyle.statusScreenIconShort
              ]}
            />

            <Text
              accessibilityRole="header"
              style={[
                ControllerStyle.statusScreenMessage,
                isCompact && ControllerStyle.statusScreenMessageCompact,
                isShort && ControllerStyle.statusScreenMessageShort
              ]}
            >
              {currentScreen.text}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                this.redirect();
              }}
              style={[ControllerStyle.statusScreenAction, isPhone && { minWidth: 124, minHeight: 50 }]}
            >
              <Text style={ControllerStyle.statusScreenActionText}>
                {currentScreen.buttonTxt}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Keep the original FSI logo and Help action in the footer. */}
        <View style={[
          ControllerStyle.statusScreenFooter,
          isCompact && ControllerStyle.statusScreenFooterCompact
        ]}>
          <Image source={logo} resizeMode="contain" style={[
            ControllerStyle.statusScreenLogo,
            isPhone && { width: 100, height: 52 }
          ]} />
          <Pressable
            accessibilityRole="button"
            style={[ControllerStyle.statusScreenHelp, isPhone && { minWidth: 102, minHeight: 48 }]}
            onPress={() => {
              this.props.navigation.navigate('Connection Help Screen');
            }}
          >
            <Text style={ControllerStyle.statusScreenHelpText}>
              Help
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }
}
