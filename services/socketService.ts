import { io, type Socket } from 'socket.io-client';

import { API_URL } from '@/services/apiService';
import type { RoomState } from '@/types/room';
import type { SharedDraftPayload } from '@/types/draft';
import type { SpinParticipant } from '@/types/spin';

type EventPayload = {
  user_joined?: () => void;
  user_left?: () => void;
  room_state?: (state: RoomState) => void;
  room_error?: (payload: { message: string }) => void;
  spin_started?: (payload: { spinId: string; roomId: string; status: string; startedAt: string; eligibleParticipants: SpinParticipant[] }) => void;
  user_eliminated?: (payload: { spinId: string; userId: string; eliminationOrder: number }) => void;
  winner_announced?: (payload: { spinId: string; winnerId: string; username: string; completedAt: string }) => void;
  spin_error?: (payload: { message: string }) => void;
  draft_shared?: (payload: { draft: SharedDraftPayload }) => void;
};

let socket: Socket | null = null;

export function connectSocket(): Socket {
  const socketUrl = API_URL.replace(/\/+$/, '');
  socket ??= io(socketUrl, { autoConnect: true });
  return socket;
}

export function joinRoomSocket(roomId: string, userId: string): void {
  connectSocket().emit('join_room', { roomId, userId });
}

export function leaveRoomSocket(roomId: string, userId: string): void {
  socket?.emit('leave_room', { roomId, userId });
}

export function startSpinSocket(roomId: string, userId: string): void {
  connectSocket().emit('start_spin', { roomId, userId });
}

export function shareDraftSocket(roomId: string, payload: Omit<SharedDraftPayload, 'draftId' | 'roomId' | 'sharedAt'>): void {
  connectSocket().emit('share_draft', { roomId, ...payload });
}

export function subscribeRoom(events: EventPayload): () => void {
  const activeSocket = connectSocket();
  const entries = Object.entries(events) as [string, (...args: unknown[]) => void][];
  entries.forEach(([event, handler]) => activeSocket.on(event, handler as (...args: any[]) => void));
  return () => entries.forEach(([event, handler]) => activeSocket.off(event, handler as (...args: any[]) => void));
}