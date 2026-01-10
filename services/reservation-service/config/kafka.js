const { Kafka } = require("kafkajs");

const brokers = (process.env.KAFKA_BROKERS || "kafka:29092")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: "parking-management-app",
  brokers,
});

module.exports = kafka;
