import { NativeModule, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type RecordingState = 'idle' | 'recording' | 'unavailable';

declare class OboeAudioNativeModule extends NativeModule {
  startRecording(): Promise<string>;
  stopRecording(): Promise<string>;
  cancelRecording(): Promise<void>;
  setEffect(name: string): void;
  getRecordingState(): RecordingState | string;
}

const stub: OboeAudioNativeModule = {
  startRecording: async () => {
    throw new Error('Oboe recording is Android-only');
  },
  stopRecording: async () => {
    throw new Error('Oboe recording is Android-only');
  },
  cancelRecording: async () => undefined,
  setEffect: () => undefined,
  getRecordingState: () => 'unavailable',
} as unknown as OboeAudioNativeModule;

const OboeAudio =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<OboeAudioNativeModule>('OboeAudio') ?? stub
    : stub;

export function startRecording(): Promise<string> {
  return OboeAudio.startRecording();
}

export function stopRecording(): Promise<string> {
  return OboeAudio.stopRecording();
}

export function cancelRecording(): Promise<void> {
  return OboeAudio.cancelRecording();
}

export function setEffect(name: string): void {
  OboeAudio.setEffect(name);
}

export function getRecordingState(): string {
  return OboeAudio.getRecordingState();
}

export default OboeAudio;
