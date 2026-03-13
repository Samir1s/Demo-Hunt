export type Role = 'DEMOGORGON' | 'SECURITY';
export type PlayerStatus = 'ALIVE' | 'CAUGHT' | 'DISCONNECTED';
export type RoomPhase = 'LOBBY' | 'RUNNING' | 'FINISHED';

export interface Position {
  x: number;
  y: number;
  orientation?: number; // degrees
}

export interface Player {
  id: string; // socket.id
  nickname: string;
  role?: Role;
  character?: string; // Character name/ID
  status: PlayerStatus;
  color: string;
  position?: Position;
  // Proximity hysteresis tracking (per-player, relative to Demogorgon)
  inAlertZone?: boolean;
  inCaptureZone?: boolean;
  // Accuse penalty: set to false after a wrong accusation
  canAccuse?: boolean;
}

export interface Room {
  id: string;
  hostId: string;
  players: Record<string, Player>;
  phase: RoomPhase;
  demogorgonId?: string;
  createdAt: number;
  // Reference to the 5 Hz proximity tick interval so we can clear it
  proximityInterval?: ReturnType<typeof setInterval>;
  // Round timer
  timerInterval?: ReturnType<typeof setInterval>;
  roundEndTime?: number; // epoch ms when round ends
}
