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
  status: PlayerStatus;
  color: string;
  position?: Position;
}

export interface Room {
  id: string;
  hostId: string;
  players: Record<string, Player>;
  phase: RoomPhase;
  demogorgonId?: string;
  createdAt: number;
}
