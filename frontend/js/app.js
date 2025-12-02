// adresa bazë e backend-it tonë
const API_BASE = "http://localhost:3000/api";

// 🔹 1. Merr listën e parkimeve dhe shfaq në tabelë
async function loadParkings() {
  try {
    const response = await fetch(`${API_BASE}/parkings`);
    if (!response.ok) {
      throw new Error("Failed to fetch parkings");
    }

    const parkings = await response.json();

    const tbody = document.getElementById("parkingsTableBody");
    tbody.innerHTML = ""; // pastro rreshtat e vjetër

    parkings.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.Id}</td>
        <td>${p.Name}</td>
        <td>${p.Capacity}</td>
        <td>${p.Occupied}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("loadParkings error:", err);
    alert("Nuk u ngarkuan parkings.");
  }
}

// 🔹 2. Krijo një rezervim të ri (POST /api/reservations)
async function createReservation(event) {
  event.preventDefault(); // mos e rifresko faqen

  const userId = document.getElementById("userId").value;
  const spotId = document.getElementById("spotId").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;

  // kthe datetime-local në formatin që pret SQL Server-i
  const startSql = startTime.replace("T", " ") + ":00";
  const endSql = endTime.replace("T", " ") + ":00";

  const payload = {
    user_id: Number(userId),
    spot_id: Number(spotId),
    start_time: startSql,
    end_time: endSql,
  };

  try {
    const response = await fetch(`${API_BASE}/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    const msgEl = document.getElementById("reservationMessage");

    if (!response.ok) {
      console.error("Error creating reservation:", data);
      msgEl.textContent = "Rezervimi dështoi: " + (data.error || data.message);
      msgEl.style.color = "red";
      return;
    }

    msgEl.textContent = "Rezervimi u krijua me sukses!";
    msgEl.style.color = "green";
    console.log("Reservation created:", data);
  } catch (err) {
    console.error("createReservation error:", err);
    alert("Gabim gjatë krijimit të rezervimit.");
  }
}

// 🔹 3. Lidhi eventet pasi të ngarkohet DOM-i
document.addEventListener("DOMContentLoaded", () => {
  const loadBtn = document.getElementById("loadParkingsBtn");
  loadBtn.addEventListener("click", loadParkings);

  const form = document.getElementById("reservationForm");
  form.addEventListener("submit", createReservation);
});
