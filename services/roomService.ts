import { api } from '@/services/apiService';
import type { RoomState } from '@/types/room';

type Identity = { username: string; deviceId: string };
type RoomEntry = { roomId?: string; id?: string; roomCode: string; userId: string };

export async function createRoom(identity: Identity): Promise<RoomEntry> {
  const response = await api.post<RoomEntry>('/rooms', identity);
  return response.data;
}

export async function joinRoom(roomCode: string, identity: Identity): Promise<RoomEntry> {
  const response = await api.post<RoomEntry>(`/rooms/${roomCode}/join`, identity);
  return response.data;
}

export async function getRoom(roomId: string): Promise<RoomState> {
  const response = await api.get<RoomState>(`/rooms/${roomId}`);
  return response.data;
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  await api.post(`/rooms/${roomId}/leave`, { userId });
}