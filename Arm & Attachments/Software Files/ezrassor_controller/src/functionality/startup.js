/**
 * Bound startup storage and network operations so the splash screen cannot wait indefinitely for an unreachable rover or a stalled device storage operation.
 */
async function finishWithin(promise, timeoutMs) {
  let timer;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          resolve(null);
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * In a browser, always show the connection page so user can choose the rover or enter offline preview. Native devices retain saved-IP reconnect.
 */
export async function getStartupRoute(platform, readStoredIp, checkReachability,
  storageTimeoutMs = 1000, connectionTimeoutMs = 3000) {
  if (platform === 'web') {
    return 'IPConnect Screen';
  }

  try {
    const storedIp = await finishWithin(readStoredIp(), storageTimeoutMs);

    if (typeof storedIp !== 'string' || storedIp.trim().length === 0) {
      return 'IPConnect Screen';
    }

    const reachable = await finishWithin(
      checkReachability(storedIp, connectionTimeoutMs),
      connectionTimeoutMs + 250
    );

    if (reachable === true) {
      return 'Controller Screen';
    }
  } catch (error) {
    // Storage or connection failure must never trap the app on the splash screen.
    return 'IPConnect Screen';
  }

  return 'IPConnect Screen';
}
