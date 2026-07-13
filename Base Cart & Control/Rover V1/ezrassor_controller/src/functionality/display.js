import { Dimensions, PixelRatio } from "react-native";

export const { height, width } = Dimensions.get('window');

const magicScalingFactor = 1 / 1920;

/**
 * Normalize font based on screen size.
 * 
 * @param {number} size Font size.
 * @param {number} multiplier Arbitrary multiplier.
 * @returns {number} Adjusted font size.
 */
export function normalize(size, multiplier = 2) {
  const maximum = Math.max(height, width)

  const newSize = size * maximum * magicScalingFactor * multiplier;

  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}
