const { Kafka, logLevel } = require("kafkajs");

const enabled = String(process.env.KAFKA_ENABLED ?? "false").trim().toLowerCase() === "true";

const brokers = String(process.env.KAFKA_BROKERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const clientId = process.env.KAFKA_CLIENT_ID || "parking-management-app";
const groupId = process.env.KAFKA_GROUP_ID || "reservation-service-group";

let producer = {
  connect: async () => {},
  disconnect: async () => {},
  send: async () => {},
};

let consumer = {
  connect: async () => {},
  disconnect: async () => {},
  subscribe: async () => {},
  run: async () => {},
};

const kafkaEnabled = enabled && brokers.length > 0;

console.log(
  "[kafka-config]",
  "enabled=",
  kafkaEnabled,
  "rawEnabled=",
  process.env.KAFKA_ENABLED,
  "brokers=",
  brokers,
  "rawBrokers=",
  process.env.KAFKA_BROKERS
);

if (kafkaEnabled) {
  if (!brokers.length) {
    console.warn("⚠️ KAFKA_ENABLED=true but KAFKA_BROKERS is empty. Kafka will be OFF.");
  } else {
    const kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.INFO,
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId });
  }
}

module.exports = { producer, consumer, enabled: kafkaEnabled, brokers, clientId, groupId };
