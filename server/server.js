const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');

// Load environment variables
dotenv.config();

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Save io instance to app
app.set('io', io);

// Connect to MongoDB
connectDB();

const telephonyProvider = require('./services/telephony/telephonyProvider');

// Socket.IO connection event handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join:user', (data) => {
    let userId = null;
    let email = null;
    if (typeof data === 'object' && data !== null) {
      userId = data.userId;
      email = data.email;
    } else {
      userId = data;
    }

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined user room: user:${userId}`);
    }

    if (email) {
      const emailRoom = `user:email:${email.toLowerCase().trim()}`;
      socket.join(emailRoom);
      console.log(`[Socket.IO] Socket ${socket.id} joined email room: ${emailRoom}`);
    }
  });

  socket.on('join:call', (callId) => {
    if (callId) {
      socket.join(`call:${callId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined call room: call:${callId}`);
    }
  });

  socket.on('leave:call', (callId) => {
    if (callId) {
      socket.leave(`call:${callId}`);
      console.log(`[Socket.IO] Socket ${socket.id} left call room: call:${callId}`);
    }
  });

  socket.on('call:accept', async ({ callId }) => {
    try {
      console.log(`[Socket.IO] Received call:accept for callId=${callId}`);
      await telephonyProvider.acceptCall(callId, io);
    } catch (err) {
      console.error('[Socket.IO] Error in call:accept:', err);
    }
  });

  socket.on('call:decline', async ({ callId, reason }) => {
    try {
      console.log(`[Socket.IO] Received call:decline for callId=${callId}`);
      await telephonyProvider.declineCall(callId, io, reason);
    } catch (err) {
      console.error('[Socket.IO] Error in call:decline:', err);
    }
  });

  socket.on('call:message', async ({ callId, text }) => {
    try {
      console.log(`[Socket.IO] Received call:message for callId=${callId}: "${text}"`);
      await telephonyProvider.handleCustomerMessage(callId, text, io);
    } catch (err) {
      console.error('[Socket.IO] Error in call:message:', err);
    }
  });

  socket.on('call:end', async ({ callId }) => {
    try {
      console.log(`[Socket.IO] Received call:end for callId=${callId}`);
      await telephonyProvider.endCall(callId, io);
    } catch (err) {
      console.error('[Socket.IO] Error in call:end:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` TalkPilot AI Server running on port ${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Calling Mode: ${process.env.CALLING_MODE || 'mock'}`);
  console.log(`=======================================================`);
});

module.exports = { app, server, io };
