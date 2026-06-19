const axios = require('axios');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;

class Paystack {
  constructor() {
    this.baseURL = 'https://api.paystack.co';
    this.secretKey = PAYSTACK_SECRET_KEY;

    const baseConfig = {
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    // Status checks, lookups, initializations
    this.readClient = axios.create({ ...baseConfig, timeout: 15000 });

    // Money movement — transfers, payouts, recipients
    this.writeClient = axios.create({ ...baseConfig, timeout: 30000 });
  }

  // Initialize payment
  async initializeTransaction({ email, amount, metadata = {} }) {
    try {
      const response = await this.readClient.post('/transaction/initialize', {
        email,
        amount: amount * 100,
        metadata,
        callback_url: process.env.PAYSTACK_CALLBACK_URL || `${process.env.FRONTEND_URL}/payment/verify`
      });
      return response.data;
    } catch (error) {
      console.error('Paystack init error:', error.response?.data);
      throw error;
    }
  }

  // Verify payment
  async verifyTransaction(reference) {
    try {
      const response = await this.readClient.get(`/transaction/verify/${reference}`);
      return response.data;
    } catch (error) {
      console.error('Paystack verify error:', error.response?.data);
      throw error;
    }
  }

  // Create transfer recipient (for runner payouts)
  async createTransferRecipient({ name, account_number, bank_code }) {
    try {
      const response = await this.writeClient.post('/transferrecipient', {
        type: 'nuban',
        name,
        account_number,
        bank_code,
        currency: 'NGN'
      });
      return response.data;
    } catch (error) {
      console.error('Paystack create recipient error:', error.response?.data);
      throw error;
    }
  }

  // Transfer to runner
  async initiateTransfer({ recipient_code, amount, reason }) {
    try {
      const response = await this.writeClient.post('/transfer', {
        source: 'balance',
        amount: amount * 100,
        recipient: recipient_code,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Paystack transfer error:', error.response?.data);
      throw error;
    }
  }

  async createCustomer({ email, first_name, last_name, metadata }) {
    try {
      const response = await this.readClient.post('/customer', { email, first_name, last_name, metadata });
      return response.data;
    } catch (error) {
      console.error('Paystack create customer error:', error.response?.data);
      throw error;
    }
  }

  // Create dedicated virtual account
  async createDedicatedVirtualAccount({ customer, preferred_bank }) {
    try {
      const response = await this.writeClient.post('/dedicated_account', { customer, preferred_bank });
      return response.data;
    } catch (error) {
      console.error('Paystack virtual account error:', error.response?.data);
      throw error;
    }
  }

  // Get list of banks
  async getBanks() {
    try {
      const response = await this.readClient.get('/bank');
      return response.data;
    } catch (error) {
      console.error('Paystack get banks error:', error.response?.data);
      throw error;
    }
  }

  // Verify account number
  async verifyAccountNumber({ account_number, bank_code }) {

    if (process.env.NODE_ENV === 'production') {
      console.log(`[DEV] Mock account verify: ${account_number} | bank: ${bank_code}`);
      return {
        status: true,
        data: {
          account_name: 'TEST ACCOUNT NAME',
          account_number,
        }
      };
    }

    try {
      const response = await this.readClient.get(`/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`);
      return response.data;
    } catch (error) {
      console.error('Paystack verify account error:', error.response?.data);
      throw error;
    }
  }
}

module.exports = new Paystack();
module.exports.PAYSTACK_PUBLIC_KEY = PAYSTACK_PUBLIC_KEY;