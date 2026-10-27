import React from 'react';
import { View, Text } from 'react-native';

// Existing video stream, rendered with an iframe in browsers.
export default function CameraFeed({ source, style }) {
  return (
    <View style={style}>
      <iframe
        title="RE-RASSOR camera"
        src={source.uri}
        style={{ width: '100%', height: '100%', border: 0 }}
        allow="autoplay"
      />
    </View>
  );
}
