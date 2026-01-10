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
            console.log("Failed to parse parkings JSON.");
            return;
        }

        if (parkings.length > 0) {
            const p = parkings[0];
            const pId = p.Id || p.id;

            console.log(`Fetching spots for Parking ID: ${pId} ...`);
            const spotRes = await get(`http://localhost:3002/api/parkings/${pId}/spots`);
            console.log("Spots Status:", spotRes.status);

            try {
                const spots = JSON.parse(spotRes.body);
                if (spots.length > 0) {
                    console.log("FIRST SPOT KEYS:", Object.keys(spots[0]));
                    console.log("FIRST SPOT OBJECT:", spots[0]);
                } else {
                    console.log("Parking found but has 0 spots.");
                }
            } catch (e) {
                console.log("Could not parse spots JSON:", spotRes.body.substring(0, 100));
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
