import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

export function FloatingNotesButton() {
  return (
    <Pressable style={styles.button} onPress={() => router.push('/notas')}>
      <Text style={styles.label}>Notas</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 36,
    backgroundColor: '#2563eb',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  label: { color: 'white', fontWeight: '600' },
});
