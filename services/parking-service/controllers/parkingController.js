// /controllers/parkingController.js
const Parking = require("../models/parkingModel");
const { sql, pool, poolConnect } = require("../config/db");
const { enabled: kafkaEnabled } = require("../config/kafka");
const producer = {
  send: async () => {
    if (kafkaEnabled) {
      console.warn("Kafka producer not configured for parking-service.");
    }
  },
};

const getParkingSpotsColumnMap = async (tx) => {
  const request = new sql.Request(tx);
  const result = await request.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ParkingSpots' AND TABLE_SCHEMA = 'dbo'
  `);
  const columns = new Set(result.recordset.map((row) => String(row.COLUMN_NAME)));
  if (columns.size === 0) {
    throw new Error("ParkingSpots table is missing");
  }
  const spotNumberColumn = columns.has("spot_number")
    ? "spot_number"
    : columns.has("SpotNumber")
    ? "SpotNumber"
    : null;
  const statusColumn = columns.has("status") ? "status" : columns.has("Status") ? "Status" : null;
  const parkingIdColumn = columns.has("ParkingId")
    ? "ParkingId"
    : columns.has("parking_id")
    ? "parking_id"
    : null;
  const isOccupiedColumn = columns.has("IsOccupied")
    ? "IsOccupied"
    : columns.has("is_occupied")
    ? "is_occupied"
    : null;

  if (!spotNumberColumn) throw new Error("ParkingSpots missing column: spot_number/SpotNumber");
  if (!statusColumn) throw new Error("ParkingSpots missing column: status/Status");
  if (!parkingIdColumn) throw new Error("ParkingSpots missing column: ParkingId/parking_id");

  return { spotNumberColumn, statusColumn, parkingIdColumn, isOccupiedColumn };
};

// GET /api/parkings
async function getAllParkings(req, res) {
  try {
    const data = await Parking.getAll();
    console.log(
      "getAllParkings counts:",
      data.map((p) => ({
        id: p.Id,
        totalSpots: p.TotalSpots,
        availableSpots: p.AvailableSpots,
      }))
    );
    res.json(data);
  } catch (err) {
    console.error("getAllParkings error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// GET /api/parkings/:id
async function getParking(req, res) {
  try {
    const data = await Parking.getById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not Found" });
    console.log("getParking counts:", {
      id: data.Id,
      totalSpots: data.TotalSpots,
      availableSpots: data.AvailableSpots,
    });
    res.json(data);
  } catch (err) {
    console.error("getParking error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

const normalizeParkingInput = (body) => {
  const name = body?.name ?? body?.Name;
  const location =
    body?.location ?? body?.Location ?? body?.address ?? body?.Address;
  const capacity =
    body?.capacity ??
    body?.Capacity ??
    body?.totalSpots ??
    body?.TotalSpots ??
    body?.total_spots;
  const occupied = body?.occupied ?? body?.Occupied ?? 0;

  return {
    name,
    location,
    capacity: capacity !== undefined ? Number(capacity) : undefined,
    occupied: occupied !== undefined ? Number(occupied) : 0,
  };
};

async function createParking(req, res) {
  await poolConnect;
  try {
    const payload = normalizeParkingInput(req.body);
    console.log("createParking payload:", {
      name: payload.name,
      location: payload.location,
      totalSpots: payload.capacity,
      pricePerHour: req.body?.pricePerHour ?? req.body?.PricePerHour,
    });
    if (!payload.name || payload.capacity === undefined || Number.isNaN(payload.capacity)) {
      return res.status(400).json({
        error: "Invalid payload",
        details: "name and capacity/totalSpots are required",
      });
    }
    if (payload.capacity < 1 || payload.capacity > 1000) {
      return res.status(400).json({
        error: "Invalid totalSpots",
        details: "totalSpots must be between 1 and 1000",
      });
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();

    let created = null;
    try {
      const insertRequest = new sql.Request(tx);
      const insertResult = await insertRequest
        .input("Name", sql.NVarChar(100), payload.name)
        .input("Location", sql.NVarChar(200), payload.location || null)
        .input("Capacity", sql.Int, payload.capacity)
        .input("Occupied", sql.Int, payload.occupied || 0)
        .query(`
          INSERT INTO Parkings (Name, Location, Capacity, Occupied)
          OUTPUT INSERTED.*
          VALUES (@Name, @Location, @Capacity, @Occupied)
        `);
      created = insertResult.recordset[0];

      const columnMap = await getParkingSpotsColumnMap(tx);

      const spotColumns = [
        columnMap.spotNumberColumn,
        columnMap.statusColumn,
        columnMap.parkingIdColumn,
        ...(columnMap.isOccupiedColumn ? [columnMap.isOccupiedColumn] : []),
      ];
      const spotValues = [
        "@spotNumber",
        "@status",
        "@parkingId",
        ...(columnMap.isOccupiedColumn ? ["@isOccupied"] : []),
      ];
      const insertSpotSql = `
        INSERT INTO ParkingSpots (${spotColumns.join(", ")})
        VALUES (${spotValues.join(", ")})
      `;

      for (let i = 1; i <= payload.capacity; i += 1) {
        const spotRequest = new sql.Request(tx);
        spotRequest.input("spotNumber", sql.Int, i);
        spotRequest.input("status", sql.NVarChar(20), "free");
        spotRequest.input("parkingId", sql.Int, created.Id);
        if (columnMap.isOccupiedColumn) {
          spotRequest.input("isOccupied", sql.Bit, 0);
        }
        await spotRequest.query(insertSpotSql);
      }
      console.log("createParking spots inserted:", {
        parkingId: created.Id,
        count: payload.capacity,
      });

      await tx.commit();
    } catch (err) {
      const originalError = err;
      console.error("createParking tx error:", originalError?.message || originalError);
      console.error("createParking tx details:", originalError?.originalError?.info || originalError?.info || "no details");
      console.error("createParking tx stack:", originalError?.stack || "no stack");
      try {
        await tx.rollback();
      } catch (rollbackErr) {
        console.error("createParking rollback error:", rollbackErr?.message || rollbackErr);
      }
      throw originalError;
    }

    const eventPayload = {
      type: "ParkingCreated",
      parkingId: created.Id,
      name: created.Name,
      location: created.Location,
      capacity: created.Capacity,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
      console.log("Kafka ParkingCreated:", eventPayload);
    } catch (err) {
      console.error("Kafka error:", err);
    }

    res.status(201).json({
      ...created,
      TotalSpots: payload.capacity,
      AvailableSpots: payload.capacity,
    });
  } catch (err) {
    console.error("createParking error:", err?.message || err);
    console.error("createParking error details:", err?.originalError?.info || err?.info || "no details");
    console.error("createParking stack:", err?.stack || "no stack");
    res.status(500).json({ error: "Error creating parking", details: err?.message });
  }
}


async function updateParking(req, res) {
  try {
    const payload = normalizeParkingInput(req.body);
    const desiredTotal = payload.capacity;
    console.log("updateParking payload:", { id: req.params.id, ...payload });

    if (desiredTotal !== undefined && (Number.isNaN(desiredTotal) || desiredTotal < 1 || desiredTotal > 1000)) {
      return res.status(400).json({
        error: "Invalid totalSpots",
        details: "totalSpots must be between 1 and 1000",
      });
    }

    let currentCount = 0;
    let maxNumber = 0;
    if (desiredTotal !== undefined) {
      await poolConnect;
      const countResult = await pool
        .request()
        .input("ParkingId", sql.Int, req.params.id)
        .query(`
          SELECT COUNT(*) AS total, MAX(spot_number) AS maxNumber
          FROM ParkingSpots
          WHERE ParkingId = @ParkingId
        `);
      currentCount = Number(countResult.recordset[0]?.total || 0);
      maxNumber = Number(countResult.recordset[0]?.maxNumber || 0);

      if (desiredTotal < currentCount) {
        return res.status(400).json({
          error: "Cannot decrease totalSpots",
          details: "totalSpots cannot be less than existing spots",
        });
      }
    }

    const updated = await Parking.update(req.params.id, payload);
    if (!updated) return res.status(404).json({ message: "Not Found" });

    if (desiredTotal !== undefined && desiredTotal > currentCount) {
      const columnMap = await getParkingSpotsColumnMap(pool);
      const spotColumns = [
        columnMap.spotNumberColumn,
        columnMap.statusColumn,
        columnMap.parkingIdColumn,
        ...(columnMap.isOccupiedColumn ? [columnMap.isOccupiedColumn] : []),
      ];
      const spotValues = [
        "@spotNumber",
        "@status",
        "@parkingId",
        ...(columnMap.isOccupiedColumn ? ["@isOccupied"] : []),
      ];
      const insertSpotSql = `
        INSERT INTO ParkingSpots (${spotColumns.join(", ")})
        VALUES (${spotValues.join(", ")})
      `;

      for (let i = maxNumber + 1; i <= desiredTotal; i += 1) {
        const spotRequest = pool.request();
        spotRequest.input("spotNumber", sql.Int, i);
        spotRequest.input("status", sql.NVarChar(20), "free");
        spotRequest.input("parkingId", sql.Int, Number(req.params.id));
        if (columnMap.isOccupiedColumn) {
          spotRequest.input("isOccupied", sql.Bit, 0);
        }
        await spotRequest.query(insertSpotSql);
      }
      console.log("updateParking spots inserted:", {
        parkingId: req.params.id,
        count: desiredTotal - currentCount,
      });
    }

    const eventPayload = {
      type: "ParkingUpdated",
      parkingId: updated.Id,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
    } catch (err) {
      console.error("Kafka error:", err);
    }

    res.json(updated);
  } catch (err) {
    console.error("updateParking error:", err?.message || err);
    console.error("updateParking details:", err?.originalError?.info || err?.info || "no details");
    res.status(500).json({ error: "Error updating parking", details: err?.message });
  }
}


// DELETE /api/parkings/:id
async function deleteParking(req, res) {
  try {
    await poolConnect;
    const parkingId = Number(req.params.id);
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const deleteSpotsRequest = new sql.Request(tx);
      deleteSpotsRequest.input("ParkingId", sql.Int, parkingId);
      while (true) {
        const result = await deleteSpotsRequest.query(`
          DELETE TOP (500) FROM ParkingSpots
          WHERE ParkingId = @ParkingId
        `);
        if ((result?.rowsAffected?.[0] || 0) === 0) {
          break;
        }
      }

      await new sql.Request(tx)
        .input("Id", sql.Int, parkingId)
        .query(`DELETE FROM Parkings WHERE Id = @Id`);
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    //Eventet per delete
    const eventPayload = {
      type: "ParkingDeleted",
      parkingId: req.params.id,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
      console.log("Kafka ParkingDeleted:", eventPayload);
    } catch (kafkaErr) {
      console.error("Kafka error (ParkingDeleted):", kafkaErr);
    }

    res.status(204).send();
  } catch (err) {
    console.error("deleteParking error:", err?.message || err);
    console.error("deleteParking details:", err?.originalError?.info || err?.info || "no details");
    res.status(500).json({ error: "Error deleting parking", details: err?.message });
  }
}

// GET /api/parkings/:id/spots
async function getParkingSpots(req, res) {
  try {
    const Spot = require("../models/spotModel");
    const spots = await Spot.getByParkingId(req.params.id);
    res.json(spots);
  } catch (err) {
    console.error("getParkingSpots error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = {
  getAllParkings,
  getParking,
  createParking,
  updateParking,
  deleteParking,
  getParkingSpots,
};
