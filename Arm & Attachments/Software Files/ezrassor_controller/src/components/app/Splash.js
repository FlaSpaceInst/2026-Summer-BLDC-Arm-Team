import React, { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import LottieView from 'lottie-react-native';
import ControllerStyle from 'ezrassor-app/src/styles/controller';
import fsg from 'ezrassor-app/assets/floridaspacegrant.png';
import { isIpReachable } from '../../functionality/connection';

SplashScreen.preventAutoHideAsync();

/**
 * React component for a splash screen.
 * 
 * First component the user sees when the app first opens.
 */
export default function Splash({ navigation }) {

	const [appIsReady, setAppIsReady] = useState(false);
	const animation = useRef(null);

	const getIpFromStorage = async () => {
		try {
			const value = await AsyncStorage.getItem('myIp');

			if (value !== null) {
				console.log('There is IP stored:', value);
				await redirectBasedOnReachability(value);
			} else {
				console.log('IP is null.');
				navigation.navigate('IPConnect Screen');
			}
		} catch (error) {
			// Error retrieving data. Log error but do nothing otherwise.
			console.log(error);
		}
	}

	/**
	 * Check if we can connect to the ip address at `this.state.ip`. Then redirect to either
	 * a "can connect" or "cannot connect" screen.
	 */
	const redirectBasedOnReachability = async (ip) => {
		const timeoutTime = 4000;

		if (await isIpReachable(ip)) {
			console.log('Connected successfully!');
			navigation.navigate('Controller Screen');
		} else {
			console.log('IP Address tried: ', ip);
			console.log('Trouble connecting. Please check rover connection or device connection.');
			navigation.navigate('IPConnect Screen');
		}
	}

	useEffect(() => {
		async function prepare() {
			try {
				await Font.loadAsync({ NASA: require('../../../assets/nasa.ttf') });
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
		const timeoutTime = 2000;

		if (appIsReady) {
			await SplashScreen.hideAsync();
			setTimeout(() => {
				getIpFromStorage();
			}, timeoutTime);
		}
	}, [appIsReady]);

	if (!appIsReady) {
		return null;
	}

	return (
		<View style={ControllerStyle.splashScreen} onLayout={onLayoutRootView}>

			{/* FSI logo. */}
			<Image source={fsg} style={ControllerStyle.splashFsiLogo} />

			{/* Body container. */}
			<View flex={1} alignItems="center">
				<LottieView
					autoPlay
					ref={animation}
					style={ControllerStyle.splashLoading}
					resizeMode="center"
					source={require('ezrassor-app/assets/loading.json')}
				/>
			</View>

		</View>
	);
}
