const axios = require('axios');

const PREMBLY_BASE_URL = 'https://api.prembly.com/identitypass/verification';
const THRESHOLDS = { AUTO_APPROVE: 0.85, AUTO_REJECT: 0.5 };
const logger = require('../utils/logger');

class PremblyService {
  isConfigured() {
    return !!(process.env.PREMBLY_API_KEY && process.env.PREMBLY_APP_ID);
  }

  async verifyDocumentWithFace({ docImageBase64, selfieImageBase64, docType, docCountry = 'NGA' }) {
    if (!this.isConfigured()) {
      logger.warn('[Prembly] Not configured — skipping automation, staying on manual review');
      return { skipped: true };
    }

    try {
      const res = await axios.post(
        `${PREMBLY_BASE_URL}/document_w_face`,
        { doc_type: docType, doc_country: docCountry, doc_image: docImageBase64, selfie_image: selfieImageBase64 },
        {
          headers: { 'x-api-key': process.env.PREMBLY_API_KEY, 'app-id': process.env.PREMBLY_APP_ID },
          timeout: 20000
        }
      );

      const { data, face_data, verification } = res.data;
      const confidence = face_data?.confidence ?? 0;

      let decision = 'manual_review';
      if (face_data?.status && confidence >= THRESHOLDS.AUTO_APPROVE) decision = 'auto_approve';
      else if (confidence <= THRESHOLDS.AUTO_REJECT) decision = 'auto_reject';

      return {
        skipped: false, success: true, confidence, decision,
        faceMatchMessage: face_data?.message,
        reference: verification?.reference,
        extractedData: data,
        raw: res.data
      };
    } catch (error) {
      logger.error('[Prembly] Call failed, falling back to manual review:', error.response?.data || error.message);
      return { skipped: true };
    }
  }
}

module.exports = new PremblyService();