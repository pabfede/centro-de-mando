import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { fetchEvents } from '../../src/features/calendar/api';
import { useGoogleCalendarAuth } from '../../src/features/calendar/googleAuth';
import { supabase } from '../../src/lib/supabase';

export default function CalendarioScreen() {
  const { status, connect, getValidAccessToken } = useGoogleCalendarAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar_events'],
    queryFn: async () => {
      const token = await getValidAccessToken();
      if (!token) return [];
      return fetchEvents(token);
    },
    enabled: status === 'connected',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendario</Text>

      {status === 'checking' && <ActivityIndicator />}

      {status === 'disconnected' && (
        <Button title="Conectar Google Calendar" onPress={connect} />
      )}

      {status === 'needs_reauth' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Tu conexión con Google Calendar necesita renovarse</Text>
          <Button title="Reconectar" onPress={connect} />
        </View>
      )}

      {status === 'connected' && (
        <FlatList
          data={events ?? []}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          ListEmptyComponent={!isLoading ? <Text style={styles.empty}>Sin eventos esta semana.</Text> : undefined}
          renderItem={({ item }) => (
            <View style={styles.eventRow}>
              <Text style={styles.eventTitle}>{item.summary}</Text>
            </View>
          )}
        />
      )}

      <Button title="Cerrar sesión" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: '600' },
  banner: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, gap: 8 },
  bannerText: { color: '#92400e' },
  eventRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  eventTitle: { fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 20, color: '#999' },
});
