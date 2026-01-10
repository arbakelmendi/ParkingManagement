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

// Helper: works with a Transaction (tx) OR with the pool (non-tx)
const getParkingSpotsColumnMap = async (txOrPool) => {
  const request =
    txOrPool instanceof sql.Transaction ? new sql.Request(txOrPool) : txOrPool.request();

  const result = await request.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ParkingSpots' AND TABLE_SCHEMA = 'dbo'
  `);

  const columns = new Set(result.recordset.map((row) => String(row.COLUMN_NAME)));
  if (columns.size === 0) throw new Error("ParkingSpots table is missing");

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

const normalizeParkingInput = (body) => {
  const name = body?.name ?? body?.Name;
  const location = body?.location ?? body?.Location ?? body?.address ?? body?.Address;
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

// POST /api/parkings
async function createParking(req, res) {
  await poolConnect;

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

  if (payload.capacity < 1 || payload.capacity > 100000) {
    return res.status(400).json({
      error: "Invalid totalSpots",
      details: "totalSpots must be between 1 and 100000",
    });
  }

  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // 1) Insert parking (DB unique index on (Name, Location) will enforce uniqueness)
    const insertResult = await new sql.Request(tx)
      .input("Name", sql.NVarChar(100), payload.name)
      .input("Location", sql.NVarChar(200), payload.location || null)
      .input("Capacity", sql.Int, payload.capacity)
      .input("Occupied", sql.Int, payload.occupied || 0)
      .query(`
        INSERT INTO dbo.Parkings (Name, Location, Capacity, Occupied)
        OUTPUT INSERTED.*
        VALUES (@Name, @Location, @Capacity, @Occupied)
      `);

    const created = insertResult.recordset[0];

    // 2) Insert spots
    const columnMap = await getParkingSpotsColumnMap(tx);

    const spotColumns = [
      `[${columnMap.spotNumberColumn}]`,
      `[${columnMap.statusColumn}]`,
      `[${columnMap.parkingIdColumn}]`,
      ...(columnMap.isOccupiedColumn ? [`[${columnMap.isOccupiedColumn}]`] : []),
    ];

    const spotValues = [
      "@spotNumber",
      "@status",
      "@parkingId",
      ...(columnMap.isOccupiedColumn ? ["@isOccupied"] : []),
    ];

    const insertSpotSql = `
      INSERT INTO dbo.ParkingSpots (${spotColumns.join(", ")})
      VALUES (${spotValues.join(", ")})
    `;

    for (let i = 1; i <= payload.capacity; i += 1) {
      const spotRequest = new sql.Request(tx);
      // spot_number is varchar in your DB → store as string
      spotRequest.input("spotNumber", sql.VarChar(10), String(i));
      spotRequest.input("status", sql.NVarChar(20), "free");
      spotRequest.input("parkingId", sql.Int, created.Id);
      if (columnMap.isOccupiedColumn) spotRequest.input("isOccupied", sql.Bit, 0);
      await spotRequest.query(insertSpotSql);
    }

    console.log("createParking spots inserted:", {
      parkingId: created.Id,
      count: payload.capacity,
    });

    await tx.commit();

    // Kafka event (best-effort)
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

    return res.status(201).json({
      ...created,
      TotalSpots: payload.capacity,
      AvailableSpots: payload.capacity,
    });
  } catch (err) {
    const sqlNumber = err?.originalError?.info?.number;

    try {
      await tx.rollback();
    } catch {}

    // ✅ Duplicate (Name+Location) -> 409
    if (sqlNumber === 2601 || sqlNumber === 2627) {
      return res.status(409).json({
        error: "Duplicate parking",
        details: "A parking with the same name already exists in this location.",
      });
    }

    console.error("createParking error:", err?.message || err);
    console.error("createParking error details:", err?.originalError?.info || err?.info || "no details");
    console.error("createParking stack:", err?.stack || "no stack");

    return res.status(500).json({
      error: "Error creating parking",
      details: err?.originalError?.info?.message || err?.message || "Unknown error",
    });
  }
}

// PUT /api/parkings/:id
async function updateParking(req, res) {
  await poolConnect;

  const parkingId = Number(req.params.id);
  if (!Number.isFinite(parkingId) || parkingId <= 0) {
    return res.status(400).json({ error: "Invalid parking id" });
  }

  try {
    const payload = normalizeParkingInput(req.body);
    const desiredTotal = payload.capacity;

    console.log("updateParking payload:", { id: parkingId, ...payload });

    if (desiredTotal !== undefined) {
      const n = Number(desiredTotal);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({
          error: "Invalid totalSpots",
          details: "totalSpots must be a non-negative number",
        });
      }
      if (n > 100000) {
        return res.status(400).json({
          error: "Invalid totalSpots",
          details: "totalSpots is too large",
        });
      }
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const columnMap = await getParkingSpotsColumnMap(tx);

      // 1) Update dbo.Parkings
      await new sql.Request(tx)
        .input("Id", sql.Int, parkingId)
        .input("Name", sql.NVarChar(100), payload.name ?? null)
        .input("Location", sql.NVarChar(200), payload.location ?? null)
        .input("Capacity", sql.Int, payload.capacity ?? null)
        .input("Occupied", sql.Int, payload.occupied ?? 0)
        .query(`
          UPDATE dbo.Parkings
          SET
            Name = COALESCE(@Name, Name),
            Location = COALESCE(@Location, Location),
            Capacity = COALESCE(@Capacity, Capacity),
            Occupied = COALESCE(@Occupied, Occupied)
          WHERE Id = @Id
        `);

      const updatedRes = await new sql.Request(tx)
        .input("Id", sql.Int, parkingId)
        .query(`SELECT * FROM dbo.Parkings WHERE Id = @Id`);

      const updated = updatedRes.recordset[0];
      if (!updated) {
        await tx.rollback();
        return res.status(404).json({ message: "Not Found" });
      }

      // 2) Manage spots only if desiredTotal provided
      if (desiredTotal !== undefined) {
        const target = Number(desiredTotal);

        // Lock + get current stats
        const statsRes = await new sql.Request(tx)
          .input("ParkingId", sql.Int, parkingId)
          .query(`
            SELECT
              COUNT(*) AS total,
              MAX(TRY_CONVERT(INT, LTRIM(RTRIM([${columnMap.spotNumberColumn}])))) AS maxNum
            FROM dbo.ParkingSpots WITH (UPDLOCK, HOLDLOCK)
            WHERE [${columnMap.parkingIdColumn}] = @ParkingId
          `);

        const currentCount = Number(statsRes.recordset[0]?.total || 0);
        let maxNumber = Number(statsRes.recordset[0]?.maxNum || 0);

        // CASE A: Add spots (fill from maxNumber+1 upward)
        if (target > currentCount) {
          const toAdd = target - currentCount;

          const spotColumns = [
            `[${columnMap.spotNumberColumn}]`,
            `[${columnMap.statusColumn}]`,
            `[${columnMap.parkingIdColumn}]`,
            ...(columnMap.isOccupiedColumn ? [`[${columnMap.isOccupiedColumn}]`] : []),
          ];

          const spotValues = [
            "@spotNumber",
            "@status",
            "@parkingId",
            ...(columnMap.isOccupiedColumn ? ["@isOccupied"] : []),
          ];

          const insertSpotSql = `
            INSERT INTO dbo.ParkingSpots (${spotColumns.join(", ")})
            VALUES (${spotValues.join(", ")})
          `;

          for (let k = 1; k <= toAdd; k += 1) {
            const next = maxNumber + 1;

            const r = new sql.Request(tx);
            r.input("spotNumber", sql.VarChar(10), String(next));
            r.input("status", sql.NVarChar(20), "free");
            r.input("parkingId", sql.Int, parkingId);
            if (columnMap.isOccupiedColumn) r.input("isOccupied", sql.Bit, 0);

            await r.query(insertSpotSql);
            maxNumber = next;
          }

          console.log("updateParking added spots:", {
            parkingId,
            added: toAdd,
            newMax: maxNumber,
          });
        }

        // CASE B: Remove spots (remove biggest free spots)
        if (target < currentCount) {
          const toRemove = currentCount - target;

          const pickRes = await new sql.Request(tx)
            .input("ParkingId", sql.Int, parkingId)
            .input("ToRemove", sql.Int, toRemove)
            .query(`
              SELECT TOP (@ToRemove)
                [${columnMap.spotNumberColumn}] AS spot_number
              FROM dbo.ParkingSpots WITH (UPDLOCK, HOLDLOCK)
              WHERE [${columnMap.parkingIdColumn}] = @ParkingId
                AND ([${columnMap.statusColumn}] = 'free' OR [${columnMap.statusColumn}] IS NULL)
                ${columnMap.isOccupiedColumn ? `AND [${columnMap.isOccupiedColumn}] = 0` : ""}
              ORDER BY TRY_CONVERT(INT, LTRIM(RTRIM([${columnMap.spotNumberColumn}]))) DESC
            `);

          const candidates = pickRes.recordset.map((r) => String(r.spot_number));

          if (candidates.length < toRemove) {
            await tx.rollback();
            return res.status(400).json({
              error: "Cannot decrease totalSpots",
              details: `Not enough free spots to remove. Need ${toRemove}, found ${candidates.length}.`,
            });
          }

          for (const sn of candidates) {
            await new sql.Request(tx)
              .input("ParkingId", sql.Int, parkingId)
              .input("SpotNumber", sql.VarChar(10), sn)
              .query(`
                DELETE FROM dbo.ParkingSpots
                WHERE [${columnMap.parkingIdColumn}] = @ParkingId
                  AND [${columnMap.spotNumberColumn}] = @SpotNumber
              `);
          }

          console.log("updateParking removed spots:", {
            parkingId,
            target,
            removed: candidates.length,
            removedSpotNumbers: candidates.slice(0, 10),
          });
        }
      }

      await tx.commit();
      return res.json(updated);
    } catch (err) {
      const sqlNumber = err?.originalError?.info?.number;

      try {
        await tx.rollback();
      } catch {}

      // ✅ If you also have unique index on (Name, Location), update can also violate it
      if (sqlNumber === 2601 || sqlNumber === 2627) {
        return res.status(409).json({
          error: "Duplicate parking",
          details: "A parking with the same name already exists in this location.",
        });
      }

      throw err;
    }
  } catch (err) {
    console.error("updateParking error:", err?.message || err);
    console.error("updateParking details:", err?.originalError?.info || err?.info || "no details");
    return res.status(500).json({
      error: "Error updating parking",
      details: err?.originalError?.info?.message || err?.message || "Unknown error",
    });
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
          DELETE TOP (500) FROM dbo.ParkingSpots
          WHERE ParkingId = @ParkingId
        `);
        if ((result?.rowsAffected?.[0] || 0) === 0) break;
      }

      await new sql.Request(tx)
        .input("Id", sql.Int, parkingId)
        .query(`DELETE FROM dbo.Parkings WHERE Id = @Id`);

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

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
