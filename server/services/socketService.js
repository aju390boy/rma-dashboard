/**
 * Socket.IO emit helper — centralised event bus.
 * Call emitEvent() from any controller to broadcast to all connected agents.
 */

let _io = null;

const initSocket = (io) => {
  _io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join:dashboard', () => {
      socket.join('dashboard');
      console.log(`📊 ${socket.id} joined dashboard room`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

const emitEvent = (event, payload) => {
  if (_io) {
    _io.to('dashboard').emit(event, { ...payload, timestamp: new Date() });
  }
};

module.exports = { initSocket, emitEvent };
