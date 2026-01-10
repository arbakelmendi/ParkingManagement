const http = require('http');

const payload = JSON.stringify({
    user_id: 1, // mocked
    spot_id: 400, // mocked from screenshot
    start_time: "2026-01-10T23:10:00",
    end_time: "2026-01-10T23:30:00",
    ParkingId: 4
});

const options = {
    hostname: 'localhost',
    port: 3003, // reservation-service port from server.cjs
    path: '/api/reservations',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        'Authorization': 'Bearer mocking_token_if_needed_but_middleware_checks_it'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('BODY:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// We need a valid token for this to work though.
// If I can't generate one, I might hit 401.
// But the user is hitting "Spot is not defined", so they are authenticated.
// I will try to login first to get a token?
// Too complex.

// Let's just run it and see if it hits 401.
// If 401, I know I need a token.
// If 500 "Spot is not defined", then my script worked.

req.write(payload);
req.end();
