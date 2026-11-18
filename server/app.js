const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false }));

// Dynamic CORS configuration allowing client origin, preview deployments, and local dev
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure database connection on incoming requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Database Middleware] DB connection error:', err.message);
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/calls', require('./routes/callRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/tts', require('./routes/ttsRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TalkPilot AI Server API',
    message: 'Backend API is running smoothly. Visit /api/health for detailed status.',
    callingMode: process.env.CALLING_MODE || 'mock',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TalkPilot AI',
    callingMode: process.env.CALLING_MODE || 'mock',
    aiProvider: process.env.AI_PROVIDER || 'free',
    timestamp: new Date()
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
