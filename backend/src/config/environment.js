const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    // Fail fast on production; warn softly in development for optional keys.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    console.warn(`[config] Missing environment variable: ${key}`);
  }
  return value;
};

const bool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  port: parseInt(process.env.PORT || '5000', 10),

  mongo: {
    uri: requiredEnv('MONGO_URI'),
  },

  jwt: {
    accessSecret: requiredEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requiredEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  ml: {
    serviceUrl: (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
    apiKey: process.env.ML_SERVICE_API_KEY || '',
    timeoutMs: parseInt(process.env.ML_TIMEOUT_MS || '8000', 10),
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  loggingEnabled: bool(process.env.LOGGING_ENABLED, true),
};

module.exports = environment;