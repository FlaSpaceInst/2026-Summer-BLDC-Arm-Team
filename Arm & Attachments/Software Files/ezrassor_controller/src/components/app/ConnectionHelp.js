import React from 'react';
import {
  Text,
  View,
  Image,
  StatusBar,
  Pressable
} from 'react-native';
import ControllerStyle from 'ezrassor-app/src/styles/controller';
import * as Font from 'expo-font';
import logo from 'ezrassor-app/assets/fsiLogo.png';
import * as SplashScreen from 'expo-splash-screen';
import { normalize } from '../../functionality/display';

const CONNECTION_TEXT = `Troubleshooting connection errors:
1. Make sure both the phone and the rover are connected to WIFI.
2. Double check you are typing in the right IP address and port when trying to connect.
3. If steps 1 and 2 did not work, try restarting both the rover and the phone
(or restarting the application).`;

/**
 * React component used as a help screen for users at the <IPConnect> screen.
 */
export default class ConnectionHelp extends React.Component {

  constructor(props) {
    SplashScreen.hideAsync();
    super(props);

    this.state = {
      isLoading: true
    };

    this.connectionText = CONNECTION_TEXT;
  }

  async componentDidMount() {
    await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf'), });

    this.setState({ isLoading: false });
  }

  redirect() { }

  render() {
    // I.e., don't do full render if font is still loading...
    if (this.state.isLoading) {
      return <View style={{ backgroundColor: '#5D6061' }} />;
    }

    return (
      <View style={ControllerStyle.screenLayout} >

        <StatusBar backgroundColor="#2E3030" barStyle="dark-content" />

        {/* Title container. */}
        <View style={[ControllerStyle.title]}>
          <Text adjustsFontSizeToFit={true} numberOfLines={1} fontSize={normalize(50)} style={[ControllerStyle.titleText]}>
            RE-RASSOR Connection Help
          </Text>
        </View>

        {/* Body container. */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>

          {/* FSI logo. */}
          <Image source={logo} style={ControllerStyle.fsiLogo} />

          {/* Inner-body container. */}
          <View adjustsFontSizeToFit={true} backgroundColor="#4a4d4e" width="70%" flexWrap="nowrap" style={ControllerStyle.containerTwo}>
            <Text
              adjustsFontSizeToFit={true}
              numberOfLines={8}
              style={{
                alignSelf: 'center',
                fontFamily: 'NASA',
                margin: 10,
                fontSize: normalize(30, 1.5),
                color: '#fff'
                }}
            >
              {this.connectionText}
            </Text>
          </View>

          {/* Back button. */}
          <Pressable
            style={[ControllerStyle.buttonContainer]}
            onPress={() => {
              this.props.navigation.goBack(null)
            }}
          >
            <Text adjustsFontSizeToFit={true} numberOfLines={1} style={[ControllerStyle.buttonText]}>
              Back
            </Text>
          </Pressable>

        </View>

      </View>
    );
  }
}
