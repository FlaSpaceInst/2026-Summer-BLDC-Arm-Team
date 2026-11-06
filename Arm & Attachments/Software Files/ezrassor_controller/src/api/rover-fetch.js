// Use a restricted Electron IPC transport only in the packaged Windows app.
// Normal web and mobile builds continue using the browser/native fetch API.
export default async function roverFetch(url, options = {}) {
    if (typeof window === 'undefined' || !window.reRassorDesktop?.request) {
        return fetch(url, options);
    }

    if (options.signal?.aborted) {
        throw new Error('Request aborted');
    }

    const requestDetails = {
        url: String(url),
        method: options.method || 'GET',
        probe: options.mode === 'no-cors'
    };
    if (options.body !== undefined) {
        requestDetails.body = options.body;
    }

    const responsePromise = window.reRassorDesktop.request(requestDetails);
    let result;
    if (options.signal) {
        result = await Promise.race([
            responsePromise,
            new Promise((resolve, reject) => {
                options.signal.addEventListener('abort', () => reject(new Error('Request aborted')), { once: true });
            })
        ]);
    } else {
        result = await responsePromise;
    }

    return {
        ok: result.ok,
        status: result.status,
        json: async () => JSON.parse(result.body),
        text: async () => result.body
    };
}
