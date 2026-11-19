import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteNote, listNotes } from '../../src/features/notes/api';

export default function NotasScreen() {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useQuery({ queryKey: ['notes'], queryFn: listNotes });

  function handleLongPress(id: string, title: string) {
    Alert.alert('Eliminar nota', `¿Eliminar "${title || 'Sin título'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(id);
          queryClient.invalidateQueries({ queryKey: ['notes'] });
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notas</Text>
        <Pressable onPress={() => router.push('/notas/new')}>
          <Text style={styles.addButton}>+ Nueva</Text>
        </Pressable>
      </View>
      <FlatList
        data={notes ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>Sin notas todavía.</Text> : undefined}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/notas/${item.id}`)}
            onLongPress={() => handleLongPress(item.id, item.title)}
          >
            <Text style={styles.rowTitle}>{item.title || 'Sin título'}</Text>
            <Text style={styles.rowPreview} numberOfLines={1}>
              {item.content}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '600' },
  addButton: { fontSize: 16, color: '#2563eb' },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowPreview: { fontSize: 14, color: '#666' },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});
