const URLS = [
  "http://localhost:3001",
  "http://localhost:3002/api/parkings",
  "http://localhost:3003/api/reservations",
];

async function ping(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    if (res.ok) return true;
    return false;
  } catch {
    return false;
  }
}

async function main() {
  const results = await Promise.all(URLS.map(ping));
  results.forEach((ok, i) => {
    const label = ok ? "OK" : "FAIL";
    console.log(`${label} ${URLS[i]}`);
  });

  if (results.some((r) => !r)) {
    process.exitCode = 1;
  }
}

main();
