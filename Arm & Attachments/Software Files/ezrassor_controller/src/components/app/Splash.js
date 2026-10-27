import React, { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Image, Platform, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import LoadingAnimation from './LoadingAnimation';
import ControllerStyle from '../../styles/controller';
import { getWebLayout } from '../../functionality/web-layout';
import fsg from '../../../assets/floridaspacegrant.png';
import { isIpReachable } from '../../functionality/connection';
import { getStartupRoute } from '../../functionality/startup';

SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Unable to hold native splash screen:', error);
});

/**
 * First screen shown when the RE-RASSOR controller opens.
 * The transition is scheduled by an effect, not by an onLayout callback.
 */
export default function Splash({ navigation }) {
  const [appIsReady, setAppIsReady] = useState(false);
  const animation = useRef(null);
  const { width, height } = useWindowDimensions();
  const webLayout = getWebLayout(width, height, Platform.OS);
  let loaderContainerStyle = { flex: 1, alignItems: 'center' };
  if (webLayout.isWeb) {
    loaderContainerStyle = {
      width: Math.min(width * 0.5, 220),
      height: Math.min(Math.max(height * 0.22, 64), 160),
      alignItems: 'center'
    };
  }

  useEffect(() => {
    let active = true;

    async function prepare() {
      try {
        await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });
        animation.current?.play();
      } catch (error) {
        console.warn('Unable to load splash font:', error);
      } finally {
        if (active) {
          setAppIsReady(true);
        }
      }
    }

    prepare();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!appIsReady) {
      return;
    }

    let cancelled = false;

    // Never let the native splash overlay block the React Native screen.
    try {
      SplashScreen.hideAsync().catch((error) => {
        console.warn('Unable to hide native splash screen:', error);
      });
    } catch (error) {
      console.warn('Unable to hide native splash screen:', error);
    }

    const timer = setTimeout(async () => {
      let route = 'IPConnect Screen';

      try {
        route = await getStartupRoute(
          Platform.OS,
          () => AsyncStorage.getItem('myIp'),
          isIpReachable
        );
      } catch (error) {
        console.warn('Startup connection check failed:', error);
      }

      if (!cancelled) {
        navigation.replace(route);
      }
    }, 1800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [appIsReady, navigation]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={[ControllerStyle.splashScreen, webLayout.isWeb && { padding: 16 }]}>
      <Image
        source={fsg}
        resizeMode="contain"
        style={[
          ControllerStyle.splashFsiLogo,
          webLayout.isWeb && {
            width: Math.min(width * 0.8, 550),
            height: Math.min(height * 0.42, 300),
            marginTop: 0,
            flexShrink: 0
          }
        ]}
      />
      <View style={loaderContainerStyle}>
        <LoadingAnimation
          autoPlay
          ref={animation}
          style={ControllerStyle.splashLoading}
          resizeMode="center"
          source={require('../../../assets/loading.json')}
        />
      </View>
    </View>
  );
}
