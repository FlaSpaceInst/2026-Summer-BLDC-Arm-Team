export default class HTTP { 

    static doPost(host, message, extension) { 

        console.log("MESSAGE: ", message, " IP ADDRESS => ", host, "Extension: ", extension );
        // Adding http:// to the IP address
        ip_adrs = "http://" + host + extension;
        console.log(ip_adrs);

        return fetch(
            ip_adrs,
            {
                method: 'POST',
                headers:{
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: message
            }
        )
        .catch((error) => {
            console.log("web-command displaying post error: ", error);
        });
    }
}