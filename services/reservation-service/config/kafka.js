// services/reservation-service/config/kafka.js
const { Kafka } = require("kafkajs");

const enabled = String(process.env.KAFKA_ENABLED || "true").toLowerCase() === "true";

const kafka = new Kafka({
  clientId: "parking-management-app",
  brokers: [(process.env.KAFKA_BROKER || "localhost:9092")],
});

const producer = kafka.producer();

module.exports = { producer, enabled };

