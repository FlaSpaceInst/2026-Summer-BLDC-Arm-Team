/**
 * Pressing the active direction repeatedly advances its speed 1 -> 2 -> 3.
 * A stopped motor or a different direction always starts at speed 1.
 * STOP is handled by the caller and resets the displayed speed to zero.
 */
export function nextTapSpeed(currentDirection, nextDirection, currentLevel) {
  if (currentDirection === nextDirection && currentLevel >= 1) {
    return Math.min(currentLevel + 1, 3);
  }
  return 1;
}
