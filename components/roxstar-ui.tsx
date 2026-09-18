import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { Palette } from '@/constants/theme';
import type { Draft } from '@/types/draft';
import type { Room } from '@/types/room';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const content = <View style={[styles.content, !scroll && { flex: 1 }]}>{children}</View>;
  return <SafeAreaView style={styles.safe}><View style={styles.brandBar}><Text style={styles.brandName}>RoxStar</Text></View>{scroll ? <ScrollView showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}</SafeAreaView>;
}

export function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return <View style={styles.header}>{onBack ? <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}><MaterialIcons name="arrow-back" size={22} color={Palette.text} /></Pressable> : null}<View style={styles.headerCopy}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View></View>;
}

import { Button as PaperButton, TouchableRipple } from 'react-native-paper';

export function PrimaryButton({ label, onPress, icon, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; disabled?: boolean }) {
  return <PaperButton mode="contained" onPress={onPress} disabled={disabled} icon={icon ? (({ size, color }) => <MaterialIcons name={icon} size={size} color={color} />) : undefined} contentStyle={{ minHeight: 52 }} style={{ borderRadius: 14 }} labelStyle={{ fontSize: 16, fontWeight: '700' }}>{label}</PaperButton>;
}

export function SecondaryButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap }) {
  return <PaperButton mode="outlined" onPress={onPress} icon={icon ? (({ size, color }) => <MaterialIcons name={icon} size={size} color={Palette.text} />) : undefined} contentStyle={{ minHeight: 52 }} style={{ borderRadius: 14, borderColor: Palette.border }} labelStyle={{ fontSize: 16, fontWeight: '700', color: Palette.text }}>{label}</PaperButton>;
}

export function SectionTitle({ children }: { children: ReactNode }) { return <Text style={styles.sectionTitle}>{children}</Text>; }

export function EmptyState({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name="mic-none" size={26} color={Palette.accent} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{action}</View>;
}

export function DraftCard({ draft, onPlay, onDelete, onEdit }: { draft: Draft; onPlay: () => void; onDelete: () => void; onEdit: () => void }) {
  return <View style={styles.cardContainer}><TouchableRipple onPress={onEdit} style={styles.card} borderless><><View style={styles.row}><View style={styles.avatar}><MaterialIcons name="graphic-eq" size={20} color={Palette.accent} /></View><View style={styles.flex}><Text style={styles.cardTitle}>{draft.name}</Text><Text style={styles.meta}>{formatDuration(draft.duration)}  •  {formatDate(draft.createdAt)}</Text></View><Pressable accessibilityLabel={`Play ${draft.name}`} onPress={(e) => { e.stopPropagation(); onPlay(); }} hitSlop={10}><MaterialIcons name="play-circle-outline" size={28} color={Palette.accent} /></Pressable></View><View style={styles.cardFooter}><Text style={styles.effect}>{draft.effect}</Text><Pressable accessibilityLabel={`Delete ${draft.name}`} onPress={(e) => { e.stopPropagation(); onDelete(); }} hitSlop={10}><MaterialIcons name="delete-outline" size={21} color={Palette.muted} /></Pressable></View></></TouchableRipple></View>;
}

export function RoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  return <View style={styles.cardContainer}><TouchableRipple onPress={onPress} style={styles.card} borderless><View style={styles.row}><View style={[styles.avatar, styles.roomAvatar]}><MaterialIcons name="tag" size={20} color={Palette.text} /></View><View style={styles.flex}><Text style={styles.cardTitle}>Room #{room.roomCode}</Text><Text style={styles.meta}>{room.status}{room.createdAt ? `  •  ${formatDate(room.createdAt)}` : ''}</Text></View><MaterialIcons name="chevron-right" size={24} color={Palette.muted} /></View></TouchableRipple></View>;
}

export function ParticipantRow({ name, isCurrent }: { name: string; isCurrent?: boolean }) { return <View style={styles.participant}><View style={styles.statusDot} /><Text style={styles.participantName}>{name}</Text>{isCurrent ? <Text style={styles.you}>YOU</Text> : null}</View>; }

export function formatDuration(durationMs: number) { const seconds = Math.floor(durationMs / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
export function formatDate(date: string) { return new Date(date).toLocaleDateString(); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background }, brandBar: { minHeight: 54, paddingHorizontal: 24, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: Palette.border }, brandName: { color: Palette.text, fontSize: 21, fontWeight: '800', letterSpacing: 0.2 }, content: { padding: 24, paddingBottom: 36 }, header: { flexDirection: 'row', alignItems: 'center', minHeight: 64, marginBottom: 26 }, headerCopy: { flex: 1 }, iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 6 }, title: { color: Palette.text, fontSize: 30, fontWeight: '800' }, subtitle: { color: Palette.muted, fontSize: 15, marginTop: 5 }, sectionTitle: { color: Palette.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }, primaryButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 14, backgroundColor: Palette.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, disabledButton: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border }, primaryLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }, disabledLabel: { color: Palette.muted }, secondaryButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 14, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, secondaryLabel: { color: Palette.text, fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.75 }, cardContainer: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background }, card: { padding: 16 }, row: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, roomAvatar: { backgroundColor: Palette.surface }, flex: { flex: 1 }, cardTitle: { color: Palette.text, fontSize: 16, fontWeight: '700' }, meta: { color: Palette.muted, fontSize: 13, marginTop: 5 }, cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Palette.border }, effect: { color: Palette.muted, fontSize: 12, fontWeight: '600' }, empty: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 24 }, emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, emptyTitle: { color: Palette.text, fontSize: 20, fontWeight: '800' }, emptyBody: { color: Palette.muted, fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 22 }, participant: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Palette.border }, statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Palette.success, marginRight: 12 }, participantName: { flex: 1, color: Palette.text, fontSize: 16, fontWeight: '600' }, you: { color: Palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
