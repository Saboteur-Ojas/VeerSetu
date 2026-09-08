const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const environment = require('./config/environment');
const authRoutes = require('./routes/auth.routes');
const personnelRoutes = require('./routes/personnel.routes');
const counsellorRoutes = require('./routes/counsellor.routes');
const commanderRoutes = require('./routes/commander.routes');
const mlRoutes = require('./routes/ml.routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const {
  errorConverter,
  errorHandler,
  notFoundHandler,
} = require('./middleware/errorHandler');
const { AppError } = require('./utils/errors');

const app = express();

// ===== Security hardening =====
app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / server-to-server calls with no Origin header.
      if (!origin || environment.cors.origin.includes('*')) {
        return callback(null, true);
      }
      if (environment.cors.origin.includes(origin)) {
        return callback(null, true);
      }
      return callback(new AppError(403, 'Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

if (environment.isDevelopment && environment.loggingEnabled) {
  app.use(morgan('dev'));
}

// ===== Application routes =====
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) =>
  res.status(200).json({ success: true, status: 'UP', timestamp: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/counsellor', counsellorRoutes);
app.use('/api/commander', commanderRoutes);
app.use('/api/ml', mlRoutes);

// ===== Error handling pipeline =====
app.use(notFoundHandler);
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;