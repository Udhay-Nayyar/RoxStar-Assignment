import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type User = { userId: string; name: string; deviceId: string };

const AUTH_STORAGE_KEY = 'roxstar.auth.user';

type AuthState = {
  user: User | null;
  initialized: boolean;
  error: string;
  initialize: () => Promise<void>;
  signIn: (name: string, deviceId?: string) => Promise<void>;
  setIdentity: (name: string, deviceId: string) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  error: '',
  initialize: async () => {
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      set({ user: storedUser ? JSON.parse(storedUser) as User : null, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },
  signIn: async (name, deviceId = 'expo-device') => {
    const trimmedName = name.trim();
    const trimmedDeviceId = deviceId.trim();
    if (!trimmedName || !trimmedDeviceId) {
      set({ error: 'Enter both a username and device ID.' });
      throw new Error('Enter both a username and device ID.');
    }
    const user = { userId: `${Date.now()}`, name: trimmedName, deviceId: trimmedDeviceId };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set({ user, error: '', initialized: true });
  },
  setIdentity: (name, deviceId) => set((state) => {
    const user = { userId: state.user?.userId ?? `${Date.now()}`, name, deviceId };
    void AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return { user, error: '' };
  }),
  signOut: async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null });
  },
}));