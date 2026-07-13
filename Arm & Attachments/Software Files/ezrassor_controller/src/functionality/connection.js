
const DEFAULT_TIMEOUT_TIME = 4000;

/**
 * Check if we can reach a specified IP + port.
 * 
 * @param {string} ip IP + port.
 * @param {number} timeoutTime Time before giving up and returning false.
 * @return {Promise<boolean>} True/false if we can reach/not reach the given address.
 */
export async function isIpReachable(ip, timeoutTime = DEFAULT_TIMEOUT_TIME) {

  console.log('Trying IP in connection.js: ', ip);

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
