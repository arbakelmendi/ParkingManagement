const API = "http://localhost:3000/api";

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

  loadSpots();
  loadReservations();
}

function logout() {
  localStorage.removeItem("token");
  document.getElementById("authMsg").innerText = "Logged out";
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

// ✅ Admin: Create Spot (needs admin token)
async function createSpot() {
  const ParkingId = Number(document.getElementById("adminParkingId").value);
  const spot_number = Number(document.getElementById("adminSpotNumber").value);
  const status = document.getElementById("adminSpotStatus").value;

  if (!ParkingId || !spot_number) {
    document.getElementById("spotMsg").innerText =
      "Parking ID dhe Spot Number janë të detyrueshme.";
    return;
  }

  const res = await fetch(`${API}/parking-spots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ ParkingId, spot_number, status }),
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("spotMsg").innerText =
      data.message || data.error || "Error creating spot";
    console.log("createSpot error:", data);
    return;
  }

  document.getElementById("spotMsg").innerText = `Spot created ✅ (id: ${data.id})`;
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
