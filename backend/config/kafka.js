// backend/config/kafka.js
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "parking-management-app",
  brokers: ["localhost:9092"], // Kafka nga Docker Compose
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "parking-group" });

module.exports = { kafka, producer, consumer };