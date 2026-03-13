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
  // Coordinate system — 1 unit ≈ 1 metre
  MAP_WIDTH: 100,   // metres
  MAP_HEIGHT: 100,  // metres
  ALERT_RADIUS: 15, // metres — triggers LOW proximity alert
  CAPTURE_RADIUS: 5, // metres — triggers HIGH alert / enables catch
  ROUND_DURATION_MS: 5 * 60 * 1000, // 5 minutes
};
