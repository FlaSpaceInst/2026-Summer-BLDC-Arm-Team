
const DEFAULT_TIMEOUT_TIME = 4000;
const ROVER_PORT = '8080';

/**
 * The rover has historically been deployed at one of these addresses.  Keep
 * the list deliberately small: a discovery action should not indiscriminately
 * probe every device on a user's network.
 */
const ROVER_CANDIDATES = [
  `192.168.1.2:${ROVER_PORT}`,
  `192.168.0.2:${ROVER_PORT}`,
  `10.0.0.2:${ROVER_PORT}`,
  `ezrassor.local:${ROVER_PORT}`,
  `rerassor.local:${ROVER_PORT}`,
];

const ROVER_DISCOVERY_PORT = '5000';
const ROVER_DISCOVERY_SUBNETS = [
  '192.168.1',
  '192.168.0',
  '192.168.10',
  '10.0.0',
];
const DISCOVERY_BATCH_SIZE = 40;

/**
 * Check if we can reach a specified IP + port.
 * 
 * @param {string} ip IP + port.
 * @param {number} timeoutTime Time before giving up and returning false.
 * @return {Promise<boolean>} True/false if we can reach/not reach the given address.
 */
export async function isIpReachable(ip, timeoutTime = DEFAULT_TIMEOUT_TIME, verbose = true) {

  if (verbose) {
    console.log('Trying IP in connection.js: ', ip);
  }

  return new Promise((resolve, _) => {

    const attemptConnection = fetch(`http://${ip}`); // default get request

    const timeout = new Promise((_, reject) => {
      setTimeout(reject, timeoutTime);
    });

    Promise
      .race([attemptConnection, timeout])
      .then(() => { resolve(true); })
      .catch(() => { resolve(false); })
  });
}

/**
 * Search for all rover services on the supported RE-RASSOR LAN deployments.
 *
 * The search intentionally does not use the text field or saved IP: discovery
 * must work before an operator knows an address.  The deployed rover image
 * uses port 5000 on common private Wi-Fi subnets; local host names and legacy
 * controller addresses are checked too. Requests are batched so discovery
 * remains responsive instead of issuing all connections at once.
 *
 * @param {number} timeoutTime Per-address timeout in milliseconds.
 * @param {number} batchSize Number of concurrent checks.
 * @return {Promise<string[]>} All reachable rover service addresses.
 */
export async function findRovers(timeoutTime = 500, batchSize = DISCOVERY_BATCH_SIZE) {
  const subnetCandidates = ROVER_DISCOVERY_SUBNETS.flatMap((subnet) =>
    Array.from(
      { length: 253 },
      (_, index) => `${subnet}.${index + 2}:${ROVER_DISCOVERY_PORT}`
    )
  );
  const candidates = [...new Set([...ROVER_CANDIDATES, ...subnetCandidates])];
  const found = [];

  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (candidate) => ({
        candidate,
        reachable: await isIpReachable(candidate, timeoutTime, false)
      }))
    );

    results.forEach(({ candidate, reachable }) => {
      if (reachable) {
        found.push(candidate);
      }
    });
  }

  return found;
}
