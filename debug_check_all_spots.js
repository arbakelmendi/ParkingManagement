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
        console.log("Fetching all spots from /api/spots ...");
        const spotRes = await get("http://localhost:3002/api/spots");
        console.log("Status:", spotRes.status);

        try {
            const spots = JSON.parse(spotRes.body);
            if (Array.isArray(spots) && spots.length > 0) {
                console.log("Found spots count:", spots.length);
                console.log("First spot keys:", Object.keys(spots[0]));
                console.log("First spot sample:", spots[0]);
            } else {
                console.log("No spots found or response is not an array.", spots);
            }
        } catch (e) {
            console.log("Could not parse JSON:", spotRes.body.substring(0, 200));
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

run();
