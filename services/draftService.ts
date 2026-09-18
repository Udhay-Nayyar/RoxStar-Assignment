import { api } from '@/services/apiService';

export type ShareDraftPayload = { userId: string; fileUrl: string; durationMs: number; effectUsed: string };

export async function shareDraft(roomId: string, payload: ShareDraftPayload): Promise<void> {
  await api.post(`/rooms/${roomId}/drafts/share`, payload);
}