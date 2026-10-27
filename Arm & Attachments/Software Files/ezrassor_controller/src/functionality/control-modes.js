/** Keep the wheel controller mounted while switching the right-hand panel. */
export function getNextControlMode(requestedMode, currentMode, previousMode) {
  if (requestedMode === 'camera') {
    if (currentMode === 'camera') {
      return { controlMode: previousMode, previousControlMode: previousMode };
    }
    return { controlMode: 'camera', previousControlMode: currentMode };
  }
  if (requestedMode === 'arm' && currentMode === 'arm') {
    return { controlMode: 'drum', previousControlMode: 'drum' };
  }
  if (requestedMode === 'arm') {
    return { controlMode: 'arm', previousControlMode: previousMode };
  }
  return { controlMode: 'drum', previousControlMode: 'drum' };
}

/** Derive the arm bridge address without changing the existing rover service port. */
export function getDefaultArmBridgeHost(roverIp) {
  if (!roverIp) {
    return '127.0.0.1:3000';
  }
  const hostname = roverIp.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  return hostname + ':3000';
}
