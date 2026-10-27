import React from 'react';
import { View } from 'react-native';
import ControllerStyle from '../../styles/controller';

/**
 * Vertical speed lights copied from the original ROVER V1 D-pad design.
 * Positive rotation fills GREEN from bottom upward; negative rotation
 * fills RED from top downward. STOP leaves all three lights gray.
 *
 * side="right" anchors beside the inside edge of the left button;
 * side="left" anchors beside the inside edge of the right button.
 * This is a visual indicator of commanded speed
 */
export default function SpeedDots({ level = 0, side = 'right', label = 'Motor speed' }) {
  let signedLevel = Number(level);
  if (!Number.isFinite(signedLevel)) {
    signedLevel = 0;
  }
  signedLevel = Math.max(-3, Math.min(3, Math.trunc(signedLevel)));

  let overlayStyle = ControllerStyle.circleOverlayVerticalLeft;
  if (side === 'left') {
    overlayStyle = ControllerStyle.circleOverlayVerticalRight;
  }

  const indicatorLevels = [3, 2, 1];
  return (
    <View
      pointerEvents="none"
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={label + ': ' + signedLevel}
      style={overlayStyle}
    >
      {indicatorLevels.map((indicatorLevel) => {
        let activeStyle = null;
        if (signedLevel >= indicatorLevel) {
          activeStyle = ControllerStyle.positiveCircle;
        } else if (signedLevel <= -(4 - indicatorLevel)) {
          activeStyle = ControllerStyle.negativeCircle;
        }
        return (
          <View
            key={indicatorLevel}
            style={[ControllerStyle.circle, activeStyle]}
          />
        );
      })}
    </View>
  );
}
