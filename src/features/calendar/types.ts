export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
};

export type CalendarIntegrationStatus = 'disconnected' | 'connected' | 'needs_reauth';
