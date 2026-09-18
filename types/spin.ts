export type SpinParticipant = {
  userId: string;
  username: string;
  status: 'active' | 'eliminated' | string;
  eliminationOrder?: number | null;
};

export type SpinState = {
  status: 'ready' | 'running' | 'complete' | string;
  participants: SpinParticipant[];
  winnerId?: string | null;
};