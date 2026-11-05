import React from 'react';
import { Animated, Platform } from 'react-native';

export default class FadeInView extends React.Component {
  state = { fadeAnim: new Animated.Value(0) };

  componentDidMount() {
    Animated.timing(this.state.fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: Platform.OS !== 'web'
    }).start();
  }

  render() {
    return (
      <Animated.View style={[this.props.style, { opacity: this.state.fadeAnim }]}>
        {this.props.children}
      </Animated.View>
    );
  }
}
