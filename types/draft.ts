export type DraftEffect = 'original' | 'echo' | 'reverb' | 'pitch';

export type Draft = {
  _id: string;
  name: string;
  duration: number;
  createdAt: string;
  effect: DraftEffect;
  fileUrl?: string;
  roomId?: string;
  sharedBy?: string;
  sharedAt?: string;
};

export type SharedDraftPayload = {
  draftId: string;
  roomId: string;
  userId: string;
  fileUrl: string;
  durationMs: number;
  effectUsed: string;
  sharedAt: string;
};