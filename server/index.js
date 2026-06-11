require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');

// Route imports
const authRoutes   = require('./routes/auth');
const orderRoutes  = require('./routes/orders');
const rmaRoutes    = require('./routes/rma');

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ──────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});
initSocket(io);

// ─── Connect DB ─────────────────────────────────────────────
connectDB();

// ─── Rate Limiters ──────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                     // max 20 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,    // 1 minute
  max: 200,                    // 200 requests/min per IP
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
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 RMA Dashboard Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready`);
  console.log(`🛡️  Rate limiting active`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
