import { create } from 'zustand';
import AudioModule from 'expo-audio/build/AudioModule';
import { RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';

import type { Draft, DraftEffect, SharedDraftPayload } from '@/types/draft';

let webRecorder: MediaRecorder | null = null;
let webStream: MediaStream | null = null;
let webChunks: Blob[] = [];
let webRecordingUri: string | null = null;
let nativeRecorder: AudioRecorder | null = null;

type StudioState = {
  drafts: Draft[];
  sharedDrafts: Draft[];
  recording: boolean;
  elapsedMs: number;
  recordingUri: string | null;
  loading: boolean;
  error: string;
  start: () => Promise<void>;
  stop: (elapsedMs: number) => Promise<void>;
  cancel: () => Promise<void>;
  saveDraft: (name: string, effect: DraftEffect) => Promise<Draft>;
  loadDrafts: () => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  addSharedDraft: (payload: SharedDraftPayload) => void;
};

export const useStudioStore = create<StudioState>((set) => ({
  drafts: [],
  sharedDrafts: [],
  recording: false,
  elapsedMs: 0,
  recordingUri: null,
  loading: false,
  error: '',
  start: async () => {
    try {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webChunks = [];
        webRecorder = new MediaRecorder(webStream);
        webRecorder.ondataavailable = (event) => { if (event.data.size) webChunks.push(event.data); };
        webRecorder.start();
        set({ recording: true, elapsedMs: 0, recordingUri: null, error: '' });
        return;
      }
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone access is required to record. Allow it in Android settings and try again.');
      }
      nativeRecorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await nativeRecorder.prepareToRecordAsync();
      nativeRecorder.record();
      set({ recording: true, elapsedMs: 0, recordingUri: null, error: '' });
    } catch (error) {
      set({ recording: false, error: error instanceof Error ? error.message : 'Unable to start recording.' });
    }
  },
  stop: async (elapsedMs) => {
    if (webRecorder) {
      const recorder = webRecorder;
      const recordingUri = await new Promise<string>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(webChunks, { type: recorder.mimeType || 'audio/webm' });
          webRecordingUri = URL.createObjectURL(blob);
          resolve(webRecordingUri);
        };
        recorder.stop();
      });
      webStream?.getTracks().forEach((track) => track.stop());
      webRecorder = null;
      webStream = null;
      set({ recording: false, elapsedMs, recordingUri });
      return;
    }
    if (!nativeRecorder) throw new Error('No active recording was found.');
    await nativeRecorder.stop();
    const recordingUri = nativeRecorder.uri;
    nativeRecorder = null;
    if (!recordingUri) throw new Error('The recording file was not created. Please record again.');
    set({ recording: false, elapsedMs, recordingUri });
  },
  cancel: async () => {
    if (webRecorder) {
      webRecorder.stop();
      webStream?.getTracks().forEach((track) => track.stop());
      webRecorder = null;
      webStream = null;
      webChunks = [];
    } else {
      if (nativeRecorder?.isRecording) await nativeRecorder.stop();
      nativeRecorder = null;
    }
    set({ recording: false, elapsedMs: 0, recordingUri: null });
  },
  saveDraft: async (name, effect) => {
    let savedDraft: Draft;
    set((state) => {
      savedDraft = {
        _id: `${Date.now()}`,
        name,
        duration: state.elapsedMs,
        createdAt: new Date().toISOString(),
        effect,
        fileUrl: state.recordingUri ?? undefined,
      };
      return { drafts: [savedDraft, ...state.drafts], recording: false, elapsedMs: 0, recordingUri: null };
    });
    return savedDraft!;
  },
  loadDrafts: async () => set({ loading: false, error: '' }),
  deleteDraft: async (id) => set((state) => ({ drafts: state.drafts.filter((draft) => draft._id !== id) })),
  addSharedDraft: (payload) => set((state) => {
    if (state.sharedDrafts.some((draft) => draft._id === payload.draftId)) return state;
    const effect = payload.effectUsed === 'pitch_shift' ? 'pitch' : payload.effectUsed === 'reverb' ? 'reverb' : payload.effectUsed === 'echo' ? 'echo' : 'original';
    const sharedDraft: Draft = { _id: payload.draftId, name: `Shared voice by ${payload.userId}`, duration: payload.durationMs, createdAt: payload.sharedAt, effect, fileUrl: payload.fileUrl, roomId: payload.roomId, sharedBy: payload.userId, sharedAt: payload.sharedAt };
    return { sharedDrafts: [sharedDraft, ...state.sharedDrafts] };
  }),
}));