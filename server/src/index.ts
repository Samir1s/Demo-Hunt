import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Basic Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Socket.IO setup
// We are explicitly using a single process. No Redis adapter or clustering is 
// configured because this is meant to be a simple deployable artifact for the hackathon.
// State will be managed purely in-memory on this single Node.js instance.
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// HTTP Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket] A user connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] A user disconnected: ${socket.id}`);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] CORS Origin: ${CORS_ORIGIN}`);
});
