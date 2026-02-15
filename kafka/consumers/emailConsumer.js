const kafka = require('../config/kafka');
const emailService = require('../../services/emailService');

const consumer = kafka.consumer({ groupId: 'email-group' });

const startEmailConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'emails' });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const emailData = JSON.parse(message.value.toString());
      
      console.log('Processing email:', emailData);
      
      try {
        await emailService.sendEmail(
          emailData.to,
          emailData.subject,
          emailData.template,
          emailData.data
        );
      } catch (error) {
        console.error('Email sending failed:', error);
        // Kafka will retry automatically
      }
    },
  });
};

module.exports = { startEmailConsumer };