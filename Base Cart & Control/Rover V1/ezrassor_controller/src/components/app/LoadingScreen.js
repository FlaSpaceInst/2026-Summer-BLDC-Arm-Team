import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Image } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import LottieView from 'lottie-react-native';
import logo from 'ezrassor-app/assets/fsiLogo.png';

SplashScreen.preventAutoHideAsync();

/**
 * React component for a loading screen. Currently unused.
 */
export default function Loading({ navigation }) {
  const [appIsReady, setAppIsReady] = useState(false);
  const animation = useRef(null);

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
      <View style={{ flex: 1, flexDirection: 'column', marginTop: 60 }}>
        <Image source={logo} style={{ width: 305, height: 159 }} />
      </View>
      
      {/* Loading dots animation. */}
      <View style={{ flex: 1, flexDirection: 'column', marginBottom: 50 }}>
        <LottieView
          autoPlay
          ref={animation}
          style={{ flex: 1, width: 400, height: 400 }}
          resizeMode="cover"
          source={require('ezrassor-app/assets/loading.json')}
        />
      </View>

    </View>
  );
}
