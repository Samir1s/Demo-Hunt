import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Phase = 'LOBBY' | 'RUNNING' | 'FINISHED' | null;
export type SubPhase = 'CHARACTER_SELECTION' | 'ROLE_REVEAL' | 'MAIN_GAME' | null;

interface Player {
  id: string;
  nickname: string;
  role?: string;
  character?: string;
  isHost: boolean;
  status: string;
}

export interface RadarPlayer {
  id: string;
  nickname: string;
  roleHint?: string;
  position: { x: number; y: number };
}

interface GameState {
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  roomId: string | null;
  playerId: string | null;
  nickname: string;
  players: Player[];
  radarPlayers: RadarPlayer[];
  phase: Phase;
  subPhase: SubPhase;
  role: string | null;
  error: string | null;
  isHost: boolean;
  alertLevel: 'NONE' | 'LOW' | 'HIGH';
  isDead: boolean;

  setNickname: (name: string) => void;
  setError: (err: string | null) => void;
  connect: () => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  createRoom: () => void;
  leaveRoom: () => void;
  startGame: () => void;
  selectCharacter: (character: string) => void;
  enterMainGame: () => void;
  updatePosition: (pos: { x: number; y: number }) => void;
  catchTarget: () => void;
  accuseTarget: (targetId: string) => void;
}

// Ensure the server URL is picked up from env or defaults to local
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  connectionStatus: 'disconnected',
  roomId: null,
  playerId: null,
  nickname: '',
  players: [],
  radarPlayers: [],
  phase: null,
  subPhase: null,
  role: null,
  error: null,
  isHost: false,
  alertLevel: 'NONE',
  isDead: false,

  setNickname: (name) => set({ nickname: name }),
  setError: (err) => set({ error: err }),

  connect: () => {
    const { socket, connectionStatus } = get();
    if (socket || connectionStatus === 'connecting' || connectionStatus === 'connected') return;

    set({ connectionStatus: 'connecting' });
    
    const newSocket = io(SERVER_URL, {
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    newSocket.on('connect', () => {
      set({ connectionStatus: 'connected', playerId: newSocket.id, error: null });
    });

    newSocket.on('connect_error', (err) => {
      set({ connectionStatus: 'error', error: `Connection failed: ${err.message}` });
    });

    newSocket.on('disconnect', () => {
      set({ connectionStatus: 'disconnected', roomId: null, phase: null, subPhase: null, players: [], radarPlayers: [], role: null, alertLevel: 'NONE', isDead: false });
    });

    newSocket.on('roomState', (data: { room: any }) => {
      const { playerId } = get();
      const players = Object.values(data.room.players).map((p: any) => ({
        id: p.id,
        nickname: p.nickname,
        role: p.role,
        character: p.character,
        isHost: p.id === data.room.hostId,
        status: p.status,
      }));
      
      set({ 
        players, 
        phase: data.room.phase,
        isHost: data.room.hostId === playerId
      });
    });

    newSocket.on('phaseChanged', (data: { phase: Phase; subPhase?: SubPhase }) => {
      set({ phase: data.phase, subPhase: data.subPhase || null });
    });

    newSocket.on('radarUpdate', (data: { players: RadarPlayer[] }) => {
      set({ radarPlayers: data.players });
    });

    newSocket.on('roleAssigned', (data: { role: string }) => {
      set({ role: data.role });
    });

    newSocket.on('proximityAlert', (data: { level: 'NONE' | 'LOW' | 'HIGH' }) => {
      set({ alertLevel: data.level });
    });

    newSocket.on('playerDied', (data: { id: string; nickname: string; role: string }) => {
      const { playerId } = get();
      if (data.id === playerId) {
        set({ isDead: true });
      }
    });

    newSocket.on('error', (data: { message: string }) => {
      set({ error: data.message });
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connectionStatus: 'disconnected', roomId: null, phase: null, subPhase: null, players: [], role: null, alertLevel: 'NONE', isDead: false });
    }
  },

  joinRoom: async (roomId) => {
    const { socket, nickname } = get();
    if (!socket || !roomId) return;
    
    socket.emit('joinRoom', { roomId: roomId.toUpperCase(), nickname });
    set({ roomId: roomId.toUpperCase(), isHost: false, error: null });
  },

  createRoom: async () => {
    const { socket, nickname } = get();
    if (!socket) return;
    
    socket.emit('joinRoom', { nickname });
    set({ isHost: true, error: null });
  },

  startGame: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('startGame', { roomId });
    }
  },

  selectCharacter: (character) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('selectCharacter', { roomId, character });
    }
  },

  enterMainGame: () => {
    set({ subPhase: 'MAIN_GAME' });
  },

  leaveRoom: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leaveRoom');
    }
    set({ roomId: null, phase: null, subPhase: null, players: [], radarPlayers: [], role: null, alertLevel: 'NONE', isDead: false });
  },

  updatePosition: (pos) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('positionUpdate', { roomId, position: pos });
    }
  },

  catchTarget: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('catchAttempt', { roomId });
    }
  },

  accuseTarget: (targetId) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('accuseAttempt', { roomId, targetId });
    }
  }
}));
