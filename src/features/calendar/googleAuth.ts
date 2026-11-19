import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { CalendarIntegrationStatus } from './types';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const STORE_KEY = 'google_calendar_tokens';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const clientId = Platform.select({
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
})!;

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

async function getStoredTokens(): Promise<StoredTokens | null> {
  const raw = await SecureStore.getItemAsync(STORE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function storeTokens(tokens: StoredTokens) {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(tokens));
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(STORE_KEY);
}

export function useGoogleCalendarAuth() {
  const [status, setStatus] = useState<CalendarIntegrationStatus | 'checking'>('checking');

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'centrodemando' });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery,
  );

  useEffect(() => {
    getStoredTokens().then((tokens) => setStatus(tokens ? 'connected' : 'disconnected'));
  }, []);

  async function connect() {
    const result = await promptAsync();
    if (result.type !== 'success' || !request) return;

    const tokenResult = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code: result.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier! },
      },
      discovery,
    );
    await storeTokens({
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken!,
      expiresAt: Date.now() + (tokenResult.expiresIn ?? 3600) * 1000,
    });
    setStatus('connected');
  }

  async function disconnect() {
    await clearTokens();
    setStatus('disconnected');
  }

  async function getValidAccessToken(): Promise<string | null> {
    const tokens = await getStoredTokens();
    if (!tokens) {
      setStatus('disconnected');
      return null;
    }
    if (Date.now() < tokens.expiresAt - 60_000) {
      return tokens.accessToken;
    }
    try {
      const refreshed = await AuthSession.refreshAsync({ clientId, refreshToken: tokens.refreshToken }, discovery);
      await storeTokens({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
        expiresAt: Date.now() + (refreshed.expiresIn ?? 3600) * 1000,
      });
      setStatus('connected');
      return refreshed.accessToken;
    } catch {
      await clearTokens();
      setStatus('needs_reauth');
      return null;
    }
  }

  return { status, connect, disconnect, getValidAccessToken };
}
