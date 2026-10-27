import roverFetch from '../api/rover-fetch';

const DEFAULT_TIMEOUT_TIME = 4000;
const ROVER_PORT = '5000';

/**
 * Known and historical rover control-service addresses. The verified deployed
 * rover is checked first so the operator does not wait for a full subnet scan.
 */
const ROVER_CANDIDATES = [
  `192.168.10.3:${ROVER_PORT}`,
  `192.168.1.2:${ROVER_PORT}`,
  `192.168.0.2:${ROVER_PORT}`,
  `10.0.0.2:${ROVER_PORT}`,
  `ezrassor.local:${ROVER_PORT}`,
  `rerassor.local:${ROVER_PORT}`,
];

const ROVER_DISCOVERY_SUBNETS = [
  '192.168.10',
  '192.168.1',
  '192.168.0',
  '10.0.0',
];
const DISCOVERY_BATCH_SIZE = 20;

/**
 * Check if we can reach a specified IP + port.
 *
 * The timeout aborts the underlying request. This prevents failed discovery
 * attempts from continuing in the background and blocking a later manual
 * connection attempt.
 *
 * @param {string} ip IP + port.
 * @param {number} timeoutTime Time before giving up and returning false.
 * @return {Promise<boolean>} True/false if we can reach/not reach the given address.
 */
export async function isIpReachable(ip, timeoutTime = DEFAULT_TIMEOUT_TIME, verbose = true) {
  if (verbose) {
    console.log('Trying IP in connection.js: ', ip);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutTime);

  try {
    const response = await roverFetch(`http://${ip}`, {
      method: 'GET',
      signal: controller.signal,
    });

<<<<<<< Updated upstream
    // Any HTTP response proves that a server answered.
    // A non-2xx status may still mean the host is reachable.
    if (verbose) 
    {
      console.log(`Response from ${ip}: HTTP ${response.status}`);
    }

    return true;
  } 
  catch (error) 
  {
    if (verbose) 
    {
      console.log(`Unable to reach ${ip}:`, error?.message ?? error);
    }

    return false;
  } 
  finally 
  {
    clearTimeout(timeout);
  }
    Promise
      .race([attemptConnection, timeout])
      .then(() => { resolve(true); })
      .catch((error) => { 
          console.log('Failed to connect to rover:', ip, error);
          resolve(false); 
        })
  });
}

/**
 * Find the first reachable rover control service on supported local networks.
 *
 * The known rover is checked first. If it is not available, the remaining
 * addresses are scanned in small batches and each expired request is aborted.
 *
 * @param {number} timeoutTime Per-address timeout in milliseconds.
 * @param {number} batchSize Number of concurrent checks.
 * @return {Promise<string[]>} The first reachable rover service, if any.
 */
export async function findRovers(timeoutTime = 1500, batchSize = DISCOVERY_BATCH_SIZE) {
  const subnetCandidates = ROVER_DISCOVERY_SUBNETS.flatMap((subnet) =>
    Array.from(
      { length: 253 },
      (_, index) => `${subnet}.${index + 2}:${ROVER_PORT}`
    )
  );
  const candidates = [...new Set([...ROVER_CANDIDATES, ...subnetCandidates])];

  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (candidate) => ({
        candidate,
        reachable: await isIpReachable(candidate, timeoutTime, false)
      }))
    );
    const rover = results.find(({ reachable }) => reachable);
    if (rover) {
      return [rover.candidate];
    }
  }

  return [];
}
