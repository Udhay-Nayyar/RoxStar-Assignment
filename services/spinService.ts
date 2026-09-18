import { api } from '@/services/apiService';
import type { SpinState } from '@/types/spin';

export async function getSpin(roomId: string): Promise<SpinState> {
  const response = await api.get<SpinState>(`/rooms/${roomId}/spin`);
  return response.data;
}