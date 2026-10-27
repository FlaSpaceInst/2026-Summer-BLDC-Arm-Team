import React from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * The installed Lottie library crashes when its native animation commands run
 * in a browser. Render a compatible loading indicator on web instead.
 *
 * Expose the same play/reset methods used by the existing controller screens.
 */
const LoadingAnimation = React.forwardRef(function LoadingAnimation(props, ref) {
  const [isPlaying, setIsPlaying] = React.useState(props.autoPlay === true);

  React.useImperativeHandle(ref, () => ({
    play() {
      setIsPlaying(true);
    },
    reset() {
      setIsPlaying(false);
    },
    pause() {
      setIsPlaying(false);
    }
  }), []);

  if (!isPlaying) {
    return null;
  }

  return (
    <View
      style={[props.style, { alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }]}
    >
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
});

export default LoadingAnimation;
