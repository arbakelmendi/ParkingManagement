const API = "http://localhost:3000/api";


// Load Parking Spots
async function loadSpots() {
    const res = await fetch(`${API}/parking-spots`);
    const data = await res.json();

    const table = document.querySelector("#spotsTable tbody");
    table.innerHTML = "";

    data.forEach(spot => {
        table.innerHTML += `
            <tr>
                <td>${spot.id}</td>
                <td>${spot.spot_number}</td>
                <td>${spot.status}</td>
            </tr>
        `;
    });
}


// Load Reservations
async function loadReservations() {
    const res = await fetch(`${API}/reservations`);
    const data = await res.json();

    const table = document.querySelector("#reservationsTable tbody");
    table.innerHTML = "";

    data.forEach(r => {
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


// Create Reservation
async function createReservation() {
    const user_id = document.getElementById("userId").value;
    const spot_id = document.getElementById("spotId").value;
    const start_time = document.getElementById("startTime").value;
    const end_time = document.getElementById("endTime").value;

    const res = await fetch(`${API}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id,
            spot_id,
            start_time,
            end_time
        })
    });

    const data = await res.json();
    document.getElementById("message").innerText = data.error || "Reservation created!";

    loadSpots();
    loadReservations();
}


// Cancel Reservation
async function cancelReservation(id) {
    await fetch(`${API}/reservations/${id}`, {
        method: "DELETE",
    });

    loadSpots();
    loadReservations();
}

async function createSpot() {
  const ParkingId = Number(document.getElementById("adminParkingId").value);
  const spot_number = Number(document.getElementById("adminSpotNumber").value);
  const status = document.getElementById("adminSpotStatus").value;

  if (!ParkingId  !spot_number) {
    document.getElementById("spotMsg").innerText = "ParkingId dhe spot_number janë të detyrueshme.";
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    document.getElementById("spotMsg").innerText = "Duhet të bësh login si admin fillimisht.";
    return;
  }

  const res = await fetch(${API}/parking-spots, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: Bearer ${token},
    },
    body: JSON.stringify({ ParkingId, spot_number, status }),
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("spotMsg").innerText = data.message  data.error || "Error creating spot";
    console.log("createSpot error:", data);
    return;
  }

  document.getElementById("spotMsg").innerText = Spot created (id: ${data.id}) ✅;
  loadSpots();
}

