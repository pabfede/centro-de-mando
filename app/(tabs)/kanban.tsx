import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createCard, deleteCard, listCards, updateCardStatus } from '../../src/features/kanban/api';
import type { KanbanCard, KanbanStatus } from '../../src/features/kanban/types';

const COLUMNS: { status: KanbanStatus; label: string }[] = [
  { status: 'pending', label: 'Pendiente' },
  { status: 'in_progress', label: 'En progreso' },
  { status: 'done', label: 'Hecho' },
];

export default function KanbanScreen() {
  const queryClient = useQueryClient();
  const { data: cards } = useQuery({ queryKey: ['kanban_cards'], queryFn: listCards });
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['kanban_cards'] });
  }

  async function handleAddCard() {
    if (!newTitle.trim()) {
      setAdding(false);
      return;
    }
    await createCard(newTitle.trim());
    setNewTitle('');
    setAdding(false);
    invalidate();
  }

  function handleCardPress(card: KanbanCard) {
    const otherStatuses = COLUMNS.filter((c) => c.status !== card.status);
    Alert.alert(card.title, 'Mover a...', [
      ...otherStatuses.map((c) => ({
        text: c.label,
        onPress: async () => {
          await updateCardStatus(card.id, c.status);
          invalidate();
        },
      })),
      {
        text: 'Eliminar',
        style: 'destructive' as const,
        onPress: async () => {
          await deleteCard(card.id);
          invalidate();
        },
      },
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.board}>
        {COLUMNS.map((column) => (
          <View key={column.status} style={styles.columnWrapper}>
            <Text style={styles.columnTitle}>{column.label}</Text>
            {(cards ?? [])
              .filter((card) => card.status === column.status)
              .map((card) => (
                <Pressable key={card.id} style={styles.card} onPress={() => handleCardPress(card)}>
                  <Text>{card.title}</Text>
                </Pressable>
              ))}
            {column.status === 'pending' && (
              <View style={styles.addRow}>
                {adding ? (
                  <TextInput
                    autoFocus
                    style={styles.addInput}
                    placeholder="Título de la tarea"
                    value={newTitle}
                    onChangeText={setNewTitle}
                    onSubmitEditing={handleAddCard}
                    onBlur={handleAddCard}
                  />
                ) : (
                  <Pressable onPress={() => setAdding(true)}>
                    <Text style={styles.addButton}>+ Nueva tarea</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  board: { paddingHorizontal: 12, gap: 16 },
  columnWrapper: { marginBottom: 16 },
  columnTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  addRow: { marginTop: 4 },
  addButton: { color: '#2563eb', fontSize: 14 },
  addInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
});
