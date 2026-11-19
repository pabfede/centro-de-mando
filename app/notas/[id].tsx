import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';
import { createNote, deleteNote, getNote, updateNote } from '../../src/features/notes/api';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const queryClient = useQueryClient();

  const { data: note } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => getNote(id),
    enabled: !isNew,
  });

  const [noteId, setNoteId] = useState<string | null>(isNew ? null : id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (note && !loaded) {
      setTitle(note.title);
      setContent(note.content);
      setLoaded(true);
    }
  }, [note, loaded]);

  async function handleBlurSave() {
    if (!title && !content) return;
    if (noteId) {
      await updateNote(noteId, { title, content });
    } else {
      const created = await createNote({ title, content });
      setNoteId(created.id);
      router.setParams({ id: created.id });
    }
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  }

  async function handleDelete() {
    if (noteId) {
      await deleteNote(noteId);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
    router.back();
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.titleInput}
        placeholder="Título"
        value={title}
        onChangeText={setTitle}
        onBlur={handleBlurSave}
      />
      <TextInput
        style={styles.contentInput}
        placeholder="Escribe aquí..."
        value={content}
        onChangeText={setContent}
        onBlur={handleBlurSave}
        multiline
      />
      {noteId ? <Button title="Eliminar" color="#dc2626" onPress={handleDelete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16, gap: 12 },
  titleInput: { fontSize: 20, fontWeight: '600', paddingVertical: 8 },
  contentInput: { flex: 1, fontSize: 16, textAlignVertical: 'top' },
});
