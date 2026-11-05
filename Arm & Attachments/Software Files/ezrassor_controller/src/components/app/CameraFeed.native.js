import React from 'react';
import { WebView } from 'react-native-webview';

export default function CameraFeed(props) {
  return <WebView originWhitelist={['*']} {...props} />;
}
