require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');
const app = require('./app');

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

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 RMA Dashboard Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready`);
  console.log(`🛡️  Rate limiting active`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
