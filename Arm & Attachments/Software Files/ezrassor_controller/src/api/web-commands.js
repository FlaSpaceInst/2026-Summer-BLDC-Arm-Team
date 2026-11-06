import roverFetch from './rover-fetch';
export default class HTTP {
    static async doPost(host, message, extension = '/') {
        let address = host.trim();
        if (!address.startsWith('http://') && !address.startsWith('https://')) {
            address = 'http://' + address;
        }
        let normalizedExtension = extension;
        if (!extension.startsWith('/')) {
            normalizedExtension = '/' + extension;
        }
        const url = address.replace(/\/$/, '') + normalizedExtension;
        const response = await roverFetch(url, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: message
        });
        if (!response.ok) {
            let detail = 'HTTP ' + response.status;
            try {
                const result = await response.json();
                if (result.error) {
                    detail = result.error;
                }
            } catch (error) {
                // The server may return a non-JSON error page.
            }
            throw new Error(detail);
        }
        return response;
    }
}
