// config/cors.js
require('dotenv').config();

// Get allowed origins from env
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

// For development, allow localhost and common ports
const isDevelopment = process.env.NODE_ENV === 'development';
const devOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
];

// Combine allowed origins
const origins = isDevelopment
  ? [...new Set([...allowedOrigins, ...devOrigins])] // Remove duplicates
  : allowedOrigins;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (origins.includes(origin) || origins.includes('*') || isDevelopment) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
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
    'X-Admin-Role',
    'X-API-Key'
  ],
  exposedHeaders: ['Content-Type', 'Content-Length', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours - cache preflight requests
};

module.exports = corsOptions;