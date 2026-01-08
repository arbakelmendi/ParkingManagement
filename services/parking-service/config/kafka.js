// services/parking-service/config/kafka.js
const { Kafka, logLevel } = require("kafkajs");

const enabled = String(process.env.KAFKA_ENABLED || "false").toLowerCase() === "true";

const brokers = String(process.env.KAFKA_BROKERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const clientId = process.env.KAFKA_CLIENT_ID || "parking-management-app";
const groupId = process.env.KAFKA_GROUP_ID || "parking-service-group";

// no-op consumer kur kafka OFF
let consumer = {
  connect: async () => {},
  disconnect: async () => {},
  subscribe: async () => {},
  run: async () => {},
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

    consumer = kafka.consumer({ groupId });
  }
}

module.exports = { consumer, enabled };