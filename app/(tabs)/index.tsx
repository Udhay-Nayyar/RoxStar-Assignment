import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { DraftCard, EmptyState, PrimaryButton, Screen, ScreenHeader } from '@/components/roxstar-ui';
import { useStudioStore } from '@/stores/studio';
import { Palette } from '@/constants/theme';
import { audioService } from '@/services/audioService';

export default function HomeScreen() {
  const router = useRouter();
  const drafts = useStudioStore((state) => state.drafts);
  const deleteDraft = useStudioStore((state) => state.deleteDraft);
  const loadDrafts = useStudioStore((state) => state.loadDrafts);
  const loading = useStudioStore((state) => state.loading);
  const error = useStudioStore((state) => state.error);
  const [playbackError, setPlaybackError] = useState('');
  useEffect(() => { void loadDrafts(); }, [loadDrafts]);
  const playDraft = async (fileUrl?: string) => {
    if (!fileUrl) { setPlaybackError('This draft has no audio file. Record it again to enable playback.'); return; }
    try { setPlaybackError(''); await audioService.play(fileUrl); } catch { setPlaybackError('Unable to play this recording on this device.'); }
  };

  return (
    <Screen>
      <ScreenHeader title="Drafts" subtitle="Your voice ideas" />
      {loading ? <ActivityIndicator color={Palette.accent} /> : null}
      {error ? <Text style={{ color: Palette.danger, marginBottom: 16 }}>{error}</Text> : null}
      {playbackError ? <Text style={{ color: Palette.danger, marginBottom: 16 }}>{playbackError}</Text> : null}
      {!loading && drafts.length ? drafts.map((draft) => <DraftCard key={draft._id} draft={draft} onPlay={() => void playDraft(draft.fileUrl)} onDelete={() => void deleteDraft(draft._id)} onEdit={() => router.push({ pathname: '/effects', params: { draftId: draft._id } })} />) : null}
      {!loading && !drafts.length ? <EmptyState title="No drafts yet" body="Record your first voice draft." action={<PrimaryButton label="Record" icon="mic" onPress={() => router.push('/recording')} />} /> : null}
      {drafts.length ? <PrimaryButton label="Record" icon="add" onPress={() => router.push('/recording')} /> : null}
    </Screen>
  );
}
