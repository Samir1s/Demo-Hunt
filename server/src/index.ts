import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { rooms, players, config } from './store';
import { Player, Room } from './types';

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

  // Handle joining a room
  socket.on('joinRoom', (payload: { roomId?: string; nickname: string; color?: string }) => {
    let { roomId, nickname, color } = payload;
    
    // Generate a simple room code if none provided
    if (!roomId) {
      roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    
    let room = rooms.get(roomId);
    
    // Initialize room if it doesn't exist
    if (!room) {
      room = {
        id: roomId,
        hostId: socket.id, // first player is host
        players: {},
        phase: 'LOBBY',
        createdAt: Date.now()
      };
      rooms.set(roomId, room);
      console.log(`[Room] Created room ${roomId} by host ${socket.id}`);
    }

    // Room limit check
    if (Object.keys(room.players).length >= config.MAX_PLAYERS) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Must be in lobby phase to join
    if (room.phase !== 'LOBBY') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    // Create player state
    const newPlayer: Player = {
      id: socket.id,
      nickname,
      status: 'ALIVE',
      color: color || '#FFFFFF',
    };

    // Add player to room and global store
    room.players[socket.id] = newPlayer;
    players.set(socket.id, newPlayer);

    // Join Socket.IO room
    socket.join(roomId);
    
    console.log(`[Room] Player ${nickname} (${socket.id}) joined room ${roomId}`);

    // Broadcast updated room state to everyone in the room
    io.to(roomId).emit('roomState', { room });
  });

  // Handle starting the game (Block 2.1 + 2.2)
  socket.on('startGame', (payload: { roomId: string }) => {
    const { roomId } = payload;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Only the host can start the game
    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    // Must be in LOBBY phase
    if (room.phase !== 'LOBBY') {
      socket.emit('error', { message: 'Game has already started' });
      return;
    }

    // Must have minimum players
    const playerIds = Object.keys(room.players);
    if (playerIds.length < config.MIN_PLAYERS) {
      socket.emit('error', { message: `Need at least ${config.MIN_PLAYERS} players to start` });
      return;
    }

    // Randomly select one player as the Demogorgon
    const randomIndex = Math.floor(Math.random() * playerIds.length);
    const demogorgonId = playerIds[randomIndex];
    room.demogorgonId = demogorgonId;

    // Assign roles to all players
    for (const pid of playerIds) {
      const player = room.players[pid];
      player.role = pid === demogorgonId ? 'DEMOGORGON' : 'SECURITY';
    }

    // Set phase to RUNNING
    room.phase = 'RUNNING';

    // Send PRIVATE role to each player (Block 2.2 — per-socket only, never broadcast)
    for (const pid of playerIds) {
      const player = room.players[pid];
      io.to(pid).emit('roleAssigned', { role: player.role });
    }

    // Broadcast phase change to ALL players in room
    io.to(roomId).emit('phaseChanged', { phase: 'RUNNING' });

    console.log(`[Game] Room ${roomId} started. Demogorgon: ${room.players[demogorgonId].nickname}`);
  });

  // Handle position updates (Block 3.1 — Coordinate System)
  socket.on('positionUpdate', (payload: { roomId: string; position: { x: number; y: number } }) => {
    const { roomId, position } = payload;
    const room = rooms.get(roomId);

    if (!room || room.phase !== 'RUNNING') return;

    const player = room.players[socket.id];
    if (!player || player.status !== 'ALIVE') return;

    // Clamp position to map bounds
    const clampedX = Math.max(0, Math.min(config.MAP_WIDTH, position.x));
    const clampedY = Math.max(0, Math.min(config.MAP_HEIGHT, position.y));
    player.position = { x: clampedX, y: clampedY };

    // Build and broadcast sanitised radar snapshot
    const playerEntries = Object.values(room.players);
    
    for (const recipient of playerEntries) {
      // Build a per-player radar view
      const radarPlayers = playerEntries
        .filter(p => p.status === 'ALIVE')
        .map(p => ({
          id: p.id,
          nickname: p.nickname,
          // Demogorgon sees all as prey; Security sees everyone as UNKNOWN
          roleHint: recipient.role === 'DEMOGORGON' ? 'PREY' as const : 'UNKNOWN' as const,
          status: p.status,
          position: p.position || { x: 0, y: 0 },
          color: p.color,
        }));

      io.to(recipient.id).emit('radarUpdate', {
        selfId: recipient.id,
        players: radarPlayers,
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] A user disconnected: ${socket.id}`);
    
    const player = players.get(socket.id);
    if (player) {
      players.delete(socket.id);

      // Find which room the player was in
      for (const [roomId, room] of rooms.entries()) {
        if (room.players[socket.id]) {
          delete room.players[socket.id];
          
          // Cleanup empty rooms
          if (Object.keys(room.players).length === 0) {
            rooms.delete(roomId);
            console.log(`[Room] Deleted empty room ${roomId}`);
          } else {
            // Reassign host if the host left
            if (room.hostId === socket.id) {
              const remainingPlayerIds = Object.keys(room.players);
              room.hostId = remainingPlayerIds[0];
              console.log(`[Room] Reassigned host of room ${roomId} to ${room.hostId}`);
            }
            // Broadcast updated state
            io.to(roomId).emit('roomState', { room });
          }
          break;
        }
      }
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] CORS Origin: ${CORS_ORIGIN}`);
});
