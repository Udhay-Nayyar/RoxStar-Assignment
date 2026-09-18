import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, Screen, ScreenHeader } from '@/components/roxstar-ui';
import { Palette } from '@/constants/theme';
import { getSpin } from '@/services/spinService';

export default function WinnerScreen() {
  const router = useRouter(); const { roomId, winnerId } = useLocalSearchParams<{ roomId: string; winnerId: string }>(); const [name, setName] = useState('');
  useEffect(() => { if (roomId) void getSpin(roomId).then((spin) => setName(spin.participants.find((p) => p.userId === winnerId)?.username ?? 'Winner')).catch(() => setName('Winner')); }, [roomId, winnerId]);
  return <Screen scroll={false}><ScreenHeader title="Round complete" onBack={() => router.replace({ pathname: '/room', params: { roomId } })} /><View style={styles.center}><View style={styles.crown}><MaterialIcons name="emoji-events" size={52} color={Palette.background} /></View><Text style={styles.overline}>THE ROXSTAR IS</Text><Text style={styles.name}>{name || '…'}</Text><Text style={styles.message}>The wheel has spoken. Congratulations!</Text></View><PrimaryButton label="Back to room" icon="arrow-back" onPress={() => router.replace({ pathname: '/room', params: { roomId } })} /></Screen>;
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, crown: { width: 104, height: 104, borderRadius: 52, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 28, shadowColor: Palette.gold, shadowOpacity: .4, shadowRadius: 24 }, overline: { color: Palette.pink, fontWeight: '900', fontSize: 12, letterSpacing: 1.4 }, name: { color: Palette.text, fontSize: 38, fontWeight: '900', marginTop: 10, textAlign: 'center' }, message: { color: Palette.muted, marginTop: 12, fontSize: 15 } });
