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

// ── Utility: Euclidean distance
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Proximity Engine (Block 4.1): 5 Hz server tick with hysteresis
function startProximityLoop(room: Room) {
  if (room.proximityInterval) clearInterval(room.proximityInterval);

  room.proximityInterval = setInterval(() => {
    if (room.phase !== 'RUNNING' || !room.demogorgonId) {
      clearInterval(room.proximityInterval!);
      room.proximityInterval = undefined;
      return;
    }

    const demogorgon = room.players[room.demogorgonId];
    if (!demogorgon || !demogorgon.position) return;

    for (const player of Object.values(room.players)) {
      if (player.id === room.demogorgonId || player.status !== 'ALIVE' || !player.position) continue;

      const dist = distance(demogorgon.position, player.position);
      const wasInAlert = player.inAlertZone || false;
      const wasInCapture = player.inCaptureZone || false;
      const nowInAlert = dist <= config.ALERT_RADIUS;
      const nowInCapture = dist <= config.CAPTURE_RADIUS;

      // Hysteresis: only fire when transitioning INTO a zone
      if (nowInCapture && !wasInCapture) {
        io.to(player.id).emit('proximityAlert', { intensity: 'HIGH' });
        player.inCaptureZone = true;
        player.inAlertZone = true;
      } else if (nowInAlert && !wasInAlert) {
        io.to(player.id).emit('proximityAlert', { intensity: 'LOW' });
        player.inAlertZone = true;
      }

      // Update zone tracking on exit
      if (!nowInAlert) { player.inAlertZone = false; player.inCaptureZone = false; }
      else if (!nowInCapture) { player.inCaptureZone = false; }
    }
  }, 200); // 5 Hz
}

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

    // Initialize accuse ability for all players
    for (const pid of playerIds) {
      room.players[pid].canAccuse = true;
    }

    // Send PRIVATE role to each player (Block 2.2 — per-socket only, never broadcast)
    for (const pid of playerIds) {
      const player = room.players[pid];
      io.to(pid).emit('roleAssigned', { role: player.role });
    }

    // Broadcast phase change to ALL players in room
    io.to(roomId).emit('phaseChanged', { phase: 'RUNNING' });

    // Start the 5 Hz proximity engine for this room
    startProximityLoop(room);

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

  // ── Catch Attempt (Block 4.3 — Demogorgon only)
  socket.on('catchAttempt', (payload: { roomId: string }) => {
    const { roomId } = payload;
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'RUNNING') return;

    // Only the Demogorgon can catch
    if (socket.id !== room.demogorgonId) {
      socket.emit('error', { message: 'Only the Demogorgon can catch' });
      return;
    }

    const demogorgon = room.players[socket.id];
    if (!demogorgon || !demogorgon.position) return;

    // Find nearest alive Security within CAPTURE_RADIUS
    let nearestId: string | null = null;
    let nearestDist = Infinity;

    for (const player of Object.values(room.players)) {
      if (player.id === socket.id || player.status !== 'ALIVE' || !player.position) continue;
      const dist = distance(demogorgon.position, player.position);
      if (dist <= config.CAPTURE_RADIUS && dist < nearestDist) {
        nearestDist = dist;
        nearestId = player.id;
      }
    }

    if (!nearestId) {
      socket.emit('error', { message: 'No player close enough to catch' });
      return;
    }

    // Mark player as caught
    room.players[nearestId].status = 'CAUGHT';
    io.to(roomId).emit('playerCaught', { playerId: nearestId });
    console.log(`[Game] ${room.players[nearestId].nickname} was caught in room ${roomId}`);

    // Check win condition: all Security caught → Demogorgon wins
    const aliveSecurityCount = Object.values(room.players)
      .filter(p => p.role === 'SECURITY' && p.status === 'ALIVE').length;

    if (aliveSecurityCount === 0) {
      room.phase = 'FINISHED';
      if (room.proximityInterval) { clearInterval(room.proximityInterval); room.proximityInterval = undefined; }
      io.to(roomId).emit('gameOver', {
        winner: 'DEMOGORGON',
        reason: 'All Security agents were caught',
        stats: Object.values(room.players).map(p => ({ id: p.id, nickname: p.nickname, role: p.role, status: p.status })),
      });
      console.log(`[Game] Room ${roomId} — Demogorgon wins!`);
    }
  });

  // ── Accuse Attempt (Block 4.3 — Security only)
  socket.on('accuseAttempt', (payload: { roomId: string; accusedPlayerId: string }) => {
    const { roomId, accusedPlayerId } = payload;
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'RUNNING') return;

    const accuser = room.players[socket.id];
    if (!accuser || accuser.status !== 'ALIVE' || accuser.role !== 'SECURITY') {
      socket.emit('error', { message: 'Only alive Security can accuse' });
      return;
    }

    if (!accuser.canAccuse) {
      socket.emit('error', { message: 'You have already used your accusation' });
      return;
    }

    if (accusedPlayerId === room.demogorgonId) {
      // Correct accusation → Security wins
      room.phase = 'FINISHED';
      if (room.proximityInterval) { clearInterval(room.proximityInterval); room.proximityInterval = undefined; }
      io.to(roomId).emit('accusationResult', { success: true, demogorgonId: room.demogorgonId });
      io.to(roomId).emit('gameOver', {
        winner: 'SECURITY',
        reason: `${accuser.nickname} correctly identified the Demogorgon!`,
        stats: Object.values(room.players).map(p => ({ id: p.id, nickname: p.nickname, role: p.role, status: p.status })),
      });
      console.log(`[Game] Room ${roomId} — Security wins! ${accuser.nickname} identified the Demogorgon.`);
    } else {
      // Wrong accusation → penalty: lose accuse ability
      accuser.canAccuse = false;
      socket.emit('accusationResult', { success: false, demogorgonId: undefined });
      console.log(`[Game] ${accuser.nickname} wrongly accused in room ${roomId}. Accuse ability revoked.`);
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
            if (room.proximityInterval) { clearInterval(room.proximityInterval); room.proximityInterval = undefined; }
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
