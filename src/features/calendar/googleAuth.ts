import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { useEffect, useState } from 'react';
import type { CalendarIntegrationStatus } from './types';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  scopes: SCOPES,
  offlineAccess: false,
});

export function useGoogleCalendarAuth() {
  const [status, setStatus] = useState<CalendarIntegrationStatus | 'checking'>('checking');

  useEffect(() => {
    const user = GoogleSignin.getCurrentUser();
    setStatus(user ? 'connected' : 'disconnected');
  }, []);

  async function connect() {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      setStatus('connected');
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return;
      setStatus('disconnected');
    }
  }

  async function disconnect() {
    await GoogleSignin.signOut();
    setStatus('disconnected');
  }

  async function getValidAccessToken(): Promise<string | null> {
    try {
      const { accessToken } = await GoogleSignin.getTokens();
      setStatus('connected');
      return accessToken;
    } catch {
      // Revoked / expired beyond silent refresh — Play Services couldn't mint a fresh token.
      setStatus('needs_reauth');
      return null;
    }
  }

  return { status, connect, disconnect, getValidAccessToken };
}
