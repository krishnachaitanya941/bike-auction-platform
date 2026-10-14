const { Server } = require('socket.io');
const config = require('./config');
const logger = require('./logger');
const { wsConnections } = require('./metrics');

let io = null;

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientOrigins, credentials: true },
    serveClient: false,
  });


  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'socket connected');
    wsConnections.inc();
    socket.on('disconnect', () => wsConnections.dec());

    socket.on('lobby:join', () => socket.join('lobby'));

    socket.on('auction:join', (payload) => {
      const id = Number(payload && payload.auctionId);
      if (!Number.isInteger(id) || id <= 0) return;
      // A page watches one auction at a time, so leave any previous auction room.
      for (const room of [...socket.rooms]) {
        if (room.startsWith('auction:')) socket.leave(room);
      }
      socket.join(`auction:${id}`);
    });

    socket.on('auction:leave', () => {
      for (const room of [...socket.rooms]) {
        if (room.startsWith('auction:')) socket.leave(room);
      }
    });
  });

  return io;
}

const isRealtimeOn = () => io !== null;

function publish(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}

function closeRealtime() {
  return new Promise((resolve) => {
    if (!io) return resolve();
    const current = io;
    io = null;
    current.close(() => resolve()); // also closes the HTTP server
  });
}

module.exports = { initRealtime, publish, isRealtimeOn, closeRealtime };
