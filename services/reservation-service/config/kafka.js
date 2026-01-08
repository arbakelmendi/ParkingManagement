// services/reservation-service/config/kafka.js
const { Kafka, logLevel } = require("kafkajs");

const enabled = String(process.env.KAFKA_ENABLED || "false").toLowerCase() === "true";

const brokers = String(process.env.KAFKA_BROKERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const clientId = process.env.KAFKA_CLIENT_ID || "parking-management-app";

// Default: no-op producer (kur Kafka është OFF)
let producer = {
  connect: async () => {},
  disconnect: async () => {},
  send: async () => {
    // no-op
  },
};

if (enabled) {
  if (!brokers.length) {
    console.warn("⚠️ KAFKA_ENABLED=true por KAFKA_BROKERS është bosh. Kafka do të jetë OFF.");
  } else {
    const kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.INFO,
    });

    producer = kafka.producer();
  }
}

module.exports = { producer, enabled };
