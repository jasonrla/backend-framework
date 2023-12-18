process.env.KAFKAJS_NO_PARTITIONER_WARNING = "1";

const { Kafka } = require('kafkajs');
const { getIsoDate, generateUUID } = require('../utils/utilsHelper.js');

function createKafkaClient() {
    return new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: [process.env.KAFKA_SERVER],
        sasl: {
            mechanism: 'plain',
            username: process.env.KAFKA_USER,
            password: process.env.KAFKA_PASSWORD,
        },
        ssl: true,
    });
}

async function sendEvent(topic, type, messages) {
    
    let payloads = [];

    for (let message of messages) {
        payloads.push({
            "id": generateUUID(),
            "source": "qa-team",
            "type": type,
            "correlation": "none",
            "timestamp": getIsoDate(),
            "data": message
        });
    }

    console.log("Kafka:",payloads);

    const kafka = createKafkaClient();
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
        topic,
        messages: payloads.map(payload => ({ value: JSON.stringify(payload) })),
    });
    await producer.disconnect();
}

module.exports = { sendEvent };
