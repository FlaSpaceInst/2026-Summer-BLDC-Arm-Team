import React from "react";
import SplashScreen from "ezrassor-app/src/components/app/Splash";
import IPConnectScreen from "ezrassor-app/src/components/app/IPConnect";
import ConnectionHelp from "ezrassor-app/src/components/app/ConnectionHelp";
import ConnectionStatusScreen from "ezrassor-app/src/components/app/ConnectionStatus";
import ControllerScreen from "ezrassor-app/src/components/app/ControllerScreen";
import LoadingScreen from "ezrassor-app/src/components/app/LoadingScreen";
import VideoController from "./src/components/app/VideoController";
import ControllerScreenPaverArm from "./src/components/app/ControllerScreenPaverArm"
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
const Stack = createNativeStackNavigator();
const navigatorOptions = {
  flex: 1, backgroundColor: '#2E3030'
}

const forFade = ({ current }) => ({
  cardStyle: {
    opacity: current.progress,
  },
});


export default function App() {

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator initialRouteName="Splash Screen"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' }
        }}>
        <Stack.Screen
          name="Controller Screen"
          component={ControllerScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="Video Controller Screen"
          component={VideoController}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="Paver Arm Controller Screen"
          component={ControllerScreenPaverArm}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="Splash Screen"
          component={SplashScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="Loading Screen"
          component={LoadingScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="Connection Status Screen"
          component={ConnectionStatusScreen}
          options={{ animation: 'none' }}

        />
        <Stack.Screen
          name="Connection Help Screen"
          component={ConnectionHelp}

          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="IPConnect Screen"
          component={IPConnectScreen}
          options={{ animation: 'none' }}

        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}