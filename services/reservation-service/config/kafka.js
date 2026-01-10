// services/reservation-service/config/kafka.js
const { Kafka, Partitioners } = require("kafkajs");

const enabled =
  String(process.env.KAFKA_ENABLED || "false").toLowerCase() === "true";

// IMPORTANT: brenda Docker mos përdor localhost
const brokers = (process.env.KAFKA_BROKERS || "kafka:29092")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let producer = null;

if (enabled) {
  const kafka = new Kafka({
    clientId: "parking-management-app",
    brokers,
  });

  // optional: me e hjek warning-un e partitioner
  producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });
} else {
  // producer dummy, me mos me plas kur thirret gabimisht
  producer = {
    connect: async () => {},
    send: async () => {},
    disconnect: async () => {},
  };
}

module.exports = {
  enabled,
  producer,
};
