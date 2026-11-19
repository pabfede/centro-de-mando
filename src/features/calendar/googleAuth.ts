import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { useEffect, useState } from 'react';
import { fetchEvents } from './api';
import type { CalendarEvent, CalendarIntegrationStatus } from './types';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
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
      // Sign out of the cached local session first: after a server-side revocation,
      // signIn() alone can resolve instantly from the local cache without ever
      // showing Google's consent screen, which looks like "nothing happens" and
      // never actually re-grants access.
      if (GoogleSignin.getCurrentUser()) {
        await GoogleSignin.signOut();
      }
      await GoogleSignin.signIn();
      // calendar.readonly is a sensitive scope — signIn() alone only grants basic
      // profile/email. It must be requested explicitly via addScopes(), which is
      // what actually shows Google's permission screen for it.
      await GoogleSignin.addScopes({ scopes: SCOPES });
      // addScopes() grants the new scope but getTokens() can still hand back the
      // previously cached access token, minted before the grant, which the
      // Calendar API then rejects. Clear it so the next getTokens() mints a
      // fresh one that actually carries the new scope.
      const { accessToken: staleToken } = await GoogleSignin.getTokens();
      await GoogleSignin.clearCachedAccessToken(staleToken);
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

  // Combines token retrieval + the actual API call so an auth failure at either
  // step (revoked token locally, or rejected server-side on the API call itself)
  // consistently surfaces as needs_reauth instead of silently returning no events.
  async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
    let accessToken: string;
    try {
      accessToken = (await GoogleSignin.getTokens()).accessToken;
    } catch {
      setStatus('needs_reauth');
      return [];
    }

    try {
      const events = await fetchEvents(accessToken);
      setStatus('connected');
      return events;
    } catch (error) {
      if (error instanceof Error && error.message === 'invalid_grant') {
        setStatus('needs_reauth');
        return [];
      }
      throw error;
    }
  }

  return { status, connect, disconnect, fetchCalendarEvents };
}
