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

/** Arm commands now use the same ROS 2 HTTP host as rover driving. */
export function getRosControlHost(roverIp) {
  if (typeof roverIp !== 'string') {
    return '';
  }

  let address = roverIp.trim().replace(/^https?:\/\//, '').split('/')[0];
  if (!address) {
    return '';
  }
  if (!address.includes(':')) {
    address += ':5000';
  }
  return address;
}
