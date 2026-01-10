const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        }).on("error", reject);
    });
}

async function run() {
    try {
        console.log("Fetching parkings...");
        let res = await get("http://localhost:3002/api/parkings");
        console.log("Parkings Status:", res.status);

        let parkings = [];
        try {
            parkings = JSON.parse(res.body);
        } catch (e) {
            console.log("Failed to parse parkings JSON:", res.body.substring(0, 100));
            return;
        }

        if (parkings.length > 0) {
            const p = parkings[0];
            console.log("First Parking Object:", p);

            const pId = p.Id || p.id;
            if (!pId) {
                console.error("Could not find ID in parking object");
                return;
            }

            console.log(`Fetching spots for Parking ID: ${pId} ...`);
            const spotRes = await get(`http://localhost:3002/api/parkings/${pId}/spots`);
            console.log("Spots Status:", spotRes.status);
            console.log("Spots Body (first 200 chars):", spotRes.body.substring(0, 200));
        } else {
            console.log("No parkings found.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

run();
