/**
 * app.js — Express application (no server.listen)
 * Exported separately so tests can import without starting the HTTP server.
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes  = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const rmaRoutes   = require('./routes/rma');

const app = express();

// ─── Rate Limiters ──────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 20, // relax in tests
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 200, // relax in tests
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ─── Health ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'RMA Dashboard API is running', timestamp: new Date() });
});

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/auth',   authLimiter, authRoutes);
app.use('/api/orders', apiLimiter,  orderRoutes);
app.use('/api/rma',    apiLimiter,  rmaRoutes);

// ─── Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

module.exports = app;
