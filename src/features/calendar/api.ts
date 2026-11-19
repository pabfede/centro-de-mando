import type { CalendarEvent } from './types';

export async function fetchEvents(accessToken: string): Promise<CalendarEvent[]> {
  const timeMin = new Date();
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 7);

  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
    `?timeMin=${encodeURIComponent(timeMin.toISOString())}` +
    `&timeMax=${encodeURIComponent(timeMax.toISOString())}` +
    '&singleEvents=true&orderBy=startTime';

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('invalid_grant');
    throw new Error(`Google Calendar API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    summary: item.summary ?? '(Sin título)',
    start: item.start?.dateTime ?? item.start?.date,
    end: item.end?.dateTime ?? item.end?.date,
  }));
}
