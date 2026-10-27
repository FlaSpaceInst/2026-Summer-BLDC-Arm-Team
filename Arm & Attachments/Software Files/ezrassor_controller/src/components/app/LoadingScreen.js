import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Image, Platform, useWindowDimensions } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import LoadingAnimation from './LoadingAnimation';
import logo from '../../../assets/fsiLogo.png';
import { getWebLayout } from '../../functionality/web-layout';

SplashScreen.preventAutoHideAsync();

/**
 * React component for a loading screen. Currently unused.
 */
export default function Loading({ navigation }) {
  const [appIsReady, setAppIsReady] = useState(false);
  const animation = useRef(null);
  const { width, height } = useWindowDimensions();
  const webLayout = getWebLayout(width, height, Platform.OS);
  let logoContainerStyle = { flex: 1, flexDirection: 'column', marginTop: 60 };
  let loaderContainerStyle = { flex: 1, flexDirection: 'column', marginBottom: 50 };
  let loadingStyle = { flex: 1, width: 400, height: 400 };
  if (webLayout.isWeb) {
    logoContainerStyle = { justifyContent: 'center', alignItems: 'center' };
    loaderContainerStyle = { height: Math.min(height * 0.32, 180), justifyContent: 'center' };
    loadingStyle = { width: Math.min(width * 0.5, 180), height: Math.min(height * 0.32, 180) };
  }

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync(Entypo.font);
        animation.current?.play();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
      setTimeout(() => {
        navigation.navigate('Controller Screen');
      }, 3000);
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2E3030',
      }}
      onLayout={onLayoutRootView}
    >

      {/* FSI logo. */}
      <View style={logoContainerStyle}>
        <Image
          source={logo}
          resizeMode="contain"
          style={{
            width: Math.min(width * 0.75, 305),
            height: Math.min(height * 0.35, 159)
          }}
        />
      </View>
      
      {/* Loading dots animation. */}
      <View style={loaderContainerStyle}>
        <LoadingAnimation
          autoPlay
          ref={animation}
          style={loadingStyle}
          resizeMode="cover"
          source={require('../../../assets/loading.json')}
        />
      </View>

    </View>
  );
}
