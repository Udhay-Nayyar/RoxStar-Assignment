import { create } from 'zustand';

import type { SpinParticipant, SpinState } from '@/types/spin';

export type SpinUiState =
  | { status: 'waiting' }
  | { status: 'starting' }
  | { status: 'running'; participants: SpinParticipant[]; eliminatedSoFar: SpinParticipant[] }
  | { status: 'completed'; winner: SpinParticipant }
  | { status: 'aborted'; reason: string };

type SpinStore = {
  state: SpinUiState;
  beginStarting: () => void;
  applyStarted: (participants: SpinParticipant[]) => void;
  applyElimination: (userId: string) => void;
  applyWinner: (winner: SpinParticipant) => void;
  applySnapshot: (snapshot: SpinState) => void;
  abort: (reason: string) => void;
  reset: () => void;
};

export const useSpinStore = create<SpinStore>((set) => ({
  state: { status: 'waiting' },
  beginStarting: () => set({ state: { status: 'starting' } }),
  applyStarted: (participants) => set({ state: { status: 'running', participants, eliminatedSoFar: [] } }),
  applyElimination: (userId) => set((current) => {
    if (current.state.status !== 'running') return current;
    const participants = current.state.participants.map((participant) => participant.userId === userId ? { ...participant, status: 'eliminated' } : participant);
    const eliminated = participants.filter((participant) => participant.status === 'eliminated');
    return { state: { status: 'running', participants, eliminatedSoFar: eliminated } };
  }),
  applyWinner: (winner) => set({ state: { status: 'completed', winner } }),
  applySnapshot: (snapshot) => set((current) => {
    if (snapshot.status === 'running') {
      const participants = snapshot.participants;
      return { state: { status: 'running', participants, eliminatedSoFar: participants.filter((participant) => participant.status === 'eliminated') } };
    }
    if (snapshot.status === 'completed' && snapshot.winnerId) {
      const winner = snapshot.participants.find((participant) => participant.userId === snapshot.winnerId);
      if (winner) return { state: { status: 'completed', winner } };
    }
    return current;
  }),
  abort: (reason) => set({ state: { status: 'aborted', reason } }),
  reset: () => set({ state: { status: 'waiting' } }),
}));