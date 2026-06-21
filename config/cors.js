// config/cors.js
require("dotenv").config();
const allowedOrigins = (process.env.allowedOrigins || '').split(',').map(o => o.trim());

const corsOptions = {
  origin: function (origin, callback) {
    // console.log('Incoming origin:', JSON.stringify(origin));
    // console.log('Allowed list:', allowedOrigins);

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Admin-Role'
  ],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

module.exports = corsOptions;
