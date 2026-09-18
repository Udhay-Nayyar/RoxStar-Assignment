
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
// import * as FileSystem from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

import { Platform } from 'react-native';

import { API_URL } from '@/services/apiService';
import type { DraftEffect } from '@/types/draft';
let currentPlayer: AudioPlayer | null = null;

function getUploadUrl(): string | null {
  const configured =
    process.env.EXPO_PUBLIC_DRAFT_UPLOAD_URL ??
    process.env.EXPO_PUBLIC_UPLOAD_URL ??
    `${API_URL}/uploads`;

  const url = configured.trim() || `${API_URL}/uploads`;

  return Platform.OS === 'web'
    ? url.replace('://10.0.2.2:', '://localhost:')
    : url;
}

async function readAudioFile(
  uri: string
): Promise<{ fileUri: string; mimeType: string }> {
  if (!uri) {
    throw new Error('Invalid audio URI');
  }

  // Data URI – decode and write to a temporary file.
  if (uri.startsWith('data:')) {
    const match =
      uri.match(/^data:audio\/(.*?);base64,(.*)$/i) ??
      uri.match(/^data:(.*?);base64,(.*)$/i);

    if (!match) {
      throw new Error('Unsupported audio data URI');
    }

    const [, mimePart, base64] = match;

    const mime = mimePart
      ? mimePart.includes('/')
        ? mimePart
        : `audio/${mimePart}`
      : 'audio/mpeg';

    const extension = mime.split('/')[1] || 'wav';

    const tempPath = `${FileSystem.cacheDirectory}temp-audio-${Date.now()}.${extension}`;

    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      fileUri: tempPath,
      mimeType: mime,
    };
  }

  // Remote URL or web URI.
  if (
    Platform.OS === 'web' ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('blob:')
  ) {
    const tempPath = `${FileSystem.cacheDirectory}temp-audio-${Date.now()}`;

    const downloadResult = await FileSystem.downloadAsync(
      uri,
      tempPath
    );

    if (downloadResult.status !== 200) {
      throw new Error(
        `Unable to download audio for uploading: ${uri}`
      );
    }

    const mime = 'audio/wav';

    return {
      fileUri: downloadResult.uri,
      mimeType: mime,
    };
  }

  // Local file URI – use directly.
  const mime = 'audio/wav';

  return {
    fileUri: uri,
    mimeType: mime,
  };
}

export const audioService = {
  async setEffect(effect: DraftEffect | string): Promise<void> {
    void effect;
  },

  async toPortableUri(uri: string): Promise<string> {
    if (!uri) {
      return '';
    }

    if (
      uri.startsWith('http://') ||
      uri.startsWith('https://')
    ) {
      return uri;
    }

    if (uri.startsWith('data:')) {
      return uri;
    }

    return uri;
  },

  async prepareDraftForSharing(uri: string): Promise<string> {
    if (!uri) {
      throw new Error('This draft has no audio file to share.');
    }

    // Already a public URL.
    if (
      uri.startsWith('http://') ||
      uri.startsWith('https://')
    ) {
      return uri;
    }

    const uploadUrl = getUploadUrl();

    if (!uploadUrl) {
      throw new Error(
        'Sharing audio requires a public upload endpoint. ' +
        'Set EXPO_PUBLIC_DRAFT_UPLOAD_URL to a backend upload URL.'
      );
    }

    const { fileUri, mimeType } = await readAudioFile(uri);

    const uploadUri = fileUri.startsWith('/') ? `file://${fileUri}` : fileUri;

    const response = await FileSystem.uploadAsync(uploadUrl, uploadUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: mimeType,
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(
        'Unable to upload the draft audio to the backend.'
      );
    }

    const payload = JSON.parse(response.body) as {
      url?: string;
    };

    if (!payload.url) {
      throw new Error(
        'The upload endpoint did not return a public URL.'
      );
    }

    return payload.url;
  },

  async play(uri: string): Promise<void> {
    currentPlayer?.pause();

    const source = uri.startsWith('/')
      ? `file://${uri}`
      : uri;

    currentPlayer = createAudioPlayer(source, {
      keepAudioSessionActive: true,
    });

    currentPlayer.play();
  },

  stop(): void {
    currentPlayer?.pause();
  },
};

