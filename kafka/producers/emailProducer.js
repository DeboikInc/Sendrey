const kafka = require('../config/kafka');

const producer = kafka.producer();

const sendEmailEvent = async (emailData) => {
  try {
    await producer.connect();
    
    await producer.send({
      topic: 'emails',
      messages: [
        { value: JSON.stringify(emailData) }
      ]
    });
    
    console.log('Email event sent to Kafka');
  } catch (error) {
    console.error('Failed to send email event:', error);
    // Don't throw - let request continue
  }
};

module.exports = { sendEmailEvent };