import { Room, Player } from './types';

// In-memory data store for the server
// Maps room code to Room object
export const rooms = new Map<string, Room>();

// Maps socket.id to the Player object for quick lookup during disconnects/position updates
export const players = new Map<string, Player>();

// Configuration constants
export const config = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 10,
};
