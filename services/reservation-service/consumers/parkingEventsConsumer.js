// backend/consumers/parkingEventsConsumer.js
const { consumer } = require("../config/kafka");

async function startConsumer() {
  await consumer.connect();

  await consumer.subscribe({
    topic: "parking-events",
    fromBeginning: true, // ose false nese s'don mesazhet e vjetra
  });

  console.log("Kafka Consumer is running and listening on 'parking-events'...");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value.toString();

      console.log("Event received from Kafka:");
      console.log("   topic     :", topic);
      console.log("   partition :", partition);
      console.log("   offset    :", message.offset);
      console.log("   value     :", value);
      console.log("------------------------------------------------------");
    },
  });
}

startConsumer().catch((err) => {
  console.error("Kafka consumer error:", err);
});
