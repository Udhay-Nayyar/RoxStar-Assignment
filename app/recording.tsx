import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Screen, ScreenHeader, SecondaryButton, formatDuration } from '@/components/roxstar-ui';
import { Palette } from '@/constants/theme';
import { audioService } from '@/services/audioService';
import { connectSocket, joinRoomSocket, shareDraftSocket } from '@/services/socketService';
import { useStudioStore } from '@/stores/studio';

export default function RecordingScreen() {
  const router = useRouter();
  const { roomId, userId } = useLocalSearchParams<{ roomId?: string; userId?: string }>();
  const recording = useStudioStore((state) => state.recording);
  const elapsedMs = useStudioStore((state) => state.elapsedMs);
  const recordingError = useStudioStore((state) => state.error);
  const start = useStudioStore((state) => state.start);
  const stop = useStudioStore((state) => state.stop);
  const cancel = useStudioStore((state) => state.cancel);
  const saveDraft = useStudioStore((state) => state.saveDraft);
  const [elapsed, setElapsed] = useState(elapsedMs);
  const [name, setName] = useState('');
  const [saveError, setSaveError] = useState('');
  useEffect(() => { if (!recording) return undefined; const startedAt = Date.now() - elapsedMs; const timer = setInterval(() => setElapsed(Date.now() - startedAt), 250); return () => clearInterval(timer); }, [recording, elapsedMs]);
  const displayElapsed = recording ? elapsed : elapsedMs;
  const isStopped = !recording && displayElapsed > 0;
  const save = async () => {
    setSaveError('');
    try {
      const draft = await saveDraft(name.trim() || 'Voice draft', 'original');
      if (roomId && userId) {
        if (!draft.fileUrl) throw new Error('The recording file was not created. Please record again.');
        connectSocket();
        joinRoomSocket(roomId, userId);
        const fileUrl = await audioService.prepareDraftForSharing(draft.fileUrl);
        shareDraftSocket(roomId, { userId, fileUrl, durationMs: draft.duration, effectUsed: 'echo' });
        router.replace({ pathname: '/room', params: { roomId, userId } });
        return;
      }
      router.replace('/(tabs)');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save the draft to the backend.');
    }
  };
  return <Screen scroll={false}><ScreenHeader title="New Draft" subtitle={recording ? 'Recording' : isStopped ? 'Ready to save' : 'Tap the microphone to begin'} onBack={() => { void cancel(); router.back(); }} /><View style={styles.center}><Text style={styles.timer}>{formatDuration(displayElapsed)}</Text><Text style={[styles.state, recording && styles.recording]}>{recording ? 'Recording' : isStopped ? 'Recording complete' : 'Ready'}</Text><Pressable accessibilityLabel={recording ? 'Stop recording' : 'Start recording'} onPress={recording ? () => void stop(elapsed) : () => void start()} style={({ pressed }) => [styles.recordButton, recording && styles.recordingButton, pressed && styles.pressed]}><MaterialIcons name={recording ? 'stop' : 'mic'} size={42} color="#FFFFFF" /></Pressable>{isStopped ? <TextInput value={name} onChangeText={setName} placeholder="Draft name" placeholderTextColor={Palette.muted} style={styles.input} /> : null}<Text style={styles.note}>{roomId ? 'This draft will be saved to the current room.' : 'Save locally, then share a draft from a room.'}</Text>{recordingError ? <Text style={styles.error}>{recordingError}</Text> : null}{saveError ? <Text style={styles.error}>{saveError}</Text> : null}</View><View style={styles.actions}>{isStopped ? <PrimaryButton label={roomId ? 'Save & share draft' : 'Save draft'} icon="check" onPress={() => void save()} /> : null}<View style={styles.actionRow}><View style={styles.actionHalf}><SecondaryButton label="Cancel" onPress={() => { void cancel(); router.back(); }} /></View>{recording ? <View style={styles.actionHalf}><SecondaryButton label="Stop" icon="stop" onPress={() => void stop(elapsed)} /></View> : null}</View></View></Screen>;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }, timer: { color: Palette.text, fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] }, state: { color: Palette.muted, fontSize: 15, marginTop: 8 }, recording: { color: Palette.accent }, recordButton: { width: 112, height: 112, borderRadius: 56, backgroundColor: Palette.accent, alignItems: 'center', justifyContent: 'center', marginTop: 36 }, recordingButton: { backgroundColor: Palette.text }, pressed: { opacity: 0.78 }, input: { width: '100%', height: 52, borderWidth: 1, borderColor: Palette.border, borderRadius: 14, paddingHorizontal: 15, color: Palette.text, marginTop: 24 }, note: { color: Palette.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 250, marginTop: 26 }, error: { color: Palette.danger, textAlign: 'center', marginTop: 12, maxWidth: 300 }, actions: { gap: 10 }, actionRow: { flexDirection: 'row', gap: 10 }, actionHalf: { flex: 1 } });