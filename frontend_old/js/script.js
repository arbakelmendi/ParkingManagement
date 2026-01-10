const AUTH_API = "http://localhost:3001/api";
const PARKING_API = "http://localhost:3002/api";
const RES_API = "http://localhost:3003/api";

// ✅ ruajmë parkingun default këtu
let firstParkingId = null;

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("authMsg").innerText = data.message || "Login failed";
    return;
  }

  localStorage.setItem("token", data.token);
  document.getElementById("authMsg").innerText =
    `Logged in as ${data.user.email} (${data.user.role})`;

  await loadParkings();   // ✅ merre firstParkingId
  loadSpots();
  loadReservations();
}

function logout() {
  localStorage.removeItem("token");
  document.getElementById("authMsg").innerText = "Logged out";
}

// ✅ Merr parkingun e parë automatikisht (Opsioni B)
async function loadParkings() {
  const res = await fetch(`${API}/parkings`);
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.log("loadParkings response:", data);
<<<<<<< HEAD
    firstParkingId = null;
    const msgEl = document.getElementById("spotMsg");
    if (msgEl) msgEl.innerText = "Nuk ka parkinge në DB. Shto një parking fillimisht.";
=======
    select.innerHTML = "<option value=''>No parkings</option>";
>>>>>>> 6b9c75b02bd9b4689eb3a18091ae313695f3d911
    return;
  }

  firstParkingId = Number(data[0].Id ?? data[0].id);

  // opsionale: informo adminin cili parking po përdoret automatikisht
  const msgEl = document.getElementById("spotMsg");
  if (msgEl) {
    const name = data[0].Name ?? data[0].name;
    msgEl.innerText = `Parking default: ${name} (ID: ${firstParkingId})`;
  }
}

// Load Parking Spots (public)
async function loadSpots() {
  const res = await fetch(`${API}/parking-spots`);
  const data = await res.json();

  const table = document.querySelector("#spotsTable tbody");
  table.innerHTML = "";

  if (!Array.isArray(data)) {
    console.log("loadSpots response:", data);
    return;
  }

  data.forEach((spot) => {
    table.innerHTML += `
      <tr>
        <td>${spot.id}</td>
        <td>${spot.spot_number}</td>
        <td>${spot.status}</td>
      </tr>
    `;
  });
}

// ✅ Admin: Create Spot (ParkingId automatik)
async function createSpot() {
  const spot_number = Number(document.getElementById("adminSpotNumber").value);
  const status = document.getElementById("adminSpotStatus").value;

  if (!getToken()) {
    document.getElementById("spotMsg").innerText = "Duhet me bo login si admin.";
    return;
  }

  // ✅ nëse parking default s’është marrë ende
  if (!firstParkingId) {
    await loadParkings();
  }

  if (!firstParkingId) {
    document.getElementById("spotMsg").innerText = "Nuk u gjet asnjë parking në DB.";
    return;
  }

  if (!spot_number) {
    document.getElementById("spotMsg").innerText = "Spot Number është i detyrueshëm.";
    return;
  }

  const res = await fetch(`${API}/parking-spots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ ParkingId: firstParkingId, spot_number, status }),
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("spotMsg").innerText =
      data.message || data.error || "Error creating spot";
    console.log("createSpot error:", data);
    return;
  }

  document.getElementById("spotMsg").innerText =
    `Spot created ✅ (id: ${data.id ?? data.Id}) for ParkingId=${firstParkingId}`;
  loadSpots();
}

// Load Reservations (needs auth)
async function loadReservations() {
  const res = await fetch(`${API}/reservations`, {
    headers: { ...authHeaders() },
  });

  const data = await res.json();

  const table = document.querySelector("#reservationsTable tbody");
  table.innerHTML = "";

  if (!res.ok) {
    document.getElementById("message").innerText =
      data.message || data.error || "You must login to load reservations";
    console.log("loadReservations error:", data);
    return;
  }

  if (!Array.isArray(data)) {
    console.log("loadReservations response:", data);
    return;
  }

  data.forEach((r) => {
    table.innerHTML += `
      <tr>
        <td>${r.id}</td>
        <td>${r.user_id}</td>
        <td>${r.spot_id}</td>
        <td>${r.start_time}</td>
        <td>${r.end_time}</td>
        <td><button onclick="cancelReservation(${r.id})">Cancel</button></td>
      </tr>
    `;
  });
}

// Create Reservation (needs auth)
async function createReservation() {
  const spot_id = Number(document.getElementById("spotId").value);
  const start_time = document.getElementById("startTime").value;
  const end_time = document.getElementById("endTime").value;

  const res = await fetch(`${API}/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ spot_id, start_time, end_time }),
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("message").innerText =
      data.message || data.error || "Error creating reservation";
    console.log("createReservation error:", data);
    return;
  }

  document.getElementById("message").innerText = "Reservation created!";
  loadSpots();
  loadReservations();
}

// Cancel Reservation (needs auth)
async function cancelReservation(id) {
  const res = await fetch(`${API}/reservations/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("message").innerText =
      data.message || data.error || "Error cancelling reservation";
    console.log("cancelReservation error:", data);
    return;
  }

  document.getElementById("message").innerText = "Reservation cancelled!";
  loadSpots();
  loadReservations();
}

// kur hapet faqja
loadSpots();
loadParkings();

async function register() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("regMsg").innerText =
      data.message || "Register failed";
    console.log("register error:", data);
    return;
  }

  // auto-login pas register
  localStorage.setItem("token", data.token);

  document.getElementById("regMsg").innerText =
    `Registered & logged in as ${data.user.email}`;

  document.getElementById("authMsg").innerText =
    `Logged in as ${data.user.email} (${data.user.role})`;

  loadSpots();
  loadReservations();
}

