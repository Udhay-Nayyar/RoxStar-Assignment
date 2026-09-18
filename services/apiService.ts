import axios from 'axios';
import { Platform } from 'react-native';

// Toggle between local emulator testing and the live AWS backend by editing EXPO_PUBLIC_API_URL in .env.
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export const API_URL = Platform.OS === 'web' && configuredApiUrl.includes('10.0.2.2') ? 'http://localhost:4000' : configuredApiUrl;
export const api = axios.create({ baseURL: API_URL, timeout: 10000 });