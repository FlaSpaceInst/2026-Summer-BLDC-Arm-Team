import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  Image,
  StatusBar,
  Pressable,
  ScrollView,
  Platform,
  useWindowDimensions
} from 'react-native';
import ControllerStyle from '../../styles/controller';
import * as Font from 'expo-font';
import logo from '../../../assets/fsiLogo.png';
import * as SplashScreen from 'expo-splash-screen';
import { getWebLayout } from '../../functionality/web-layout';

const CONNECTION_TEXT = `Troubleshooting connection errors:
1. Make sure both the phone and the rover are connected to WIFI.
2. Double check you are typing in the right IP address and port when trying to connect.
3. If steps 1 and 2 did not work, try restarting both the rover and the phone
(or restarting the application).`;

/**
 * React component used as a help screen for users at the <IPConnect> screen.
 */
export default function ConnectionHelp({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const { width, height } = useWindowDimensions();
  const webLayout = getWebLayout(width, height, Platform.OS);

  useEffect(() => {
    let active = true;

    async function prepare() {
      try {
        await SplashScreen.hideAsync();
        await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });
      } catch (error) {
        console.warn('Could not load the help screen font:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    prepare();
    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#2E3030' }} />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#2E3030' }}
      contentContainerStyle={{
        flexGrow: 1,
        minHeight: webLayout.viewportMinHeight,
        alignItems: 'center',
        padding: webLayout.helpPadding,
        justifyContent: 'space-between',
        gap: 18
      }}
    >
      <StatusBar backgroundColor="#2E3030" barStyle="light-content" />
      <View style={[
        ControllerStyle.title,
        { width: '100%', maxWidth: 840, minHeight: 72, height: undefined, padding: 12 }
      ]}>
        <Text style={[
          ControllerStyle.titleText,
          { fontSize: webLayout.helpTitleSize }
        ]}>
          RE-RASSOR Connection Help
        </Text>
      </View>
      <View style={{
        width: '100%',
        maxWidth: 850,
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 16
      }}>
        <View style={{
          backgroundColor: '#4a4d4e',
          borderRadius: 15,
          paddingHorizontal: webLayout.helpTextPaddingHorizontal,
          paddingVertical: webLayout.helpTextPaddingVertical
        }}>
          <Text style={{
            fontFamily: 'NASA',
            fontSize: webLayout.helpTextSize,
            lineHeight: webLayout.helpLineHeight,
            color: '#fff'
          }}>
            {CONNECTION_TEXT}
          </Text>
        </View>
      </View>
      <View style={{
        width: '100%',
        maxWidth: 1000,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Image source={logo} resizeMode="contain" style={{ width: webLayout.helpLogoWidth, height: 65 }} />
        <Pressable
          style={{ backgroundColor: '#fff', borderRadius: 8, minWidth: 125, minHeight: 54, justifyContent: 'center' }}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: 'NASA', color: '#202323', fontSize: 28, textAlign: 'center' }}>Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
