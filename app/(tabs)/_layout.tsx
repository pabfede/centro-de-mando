import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Calendario' }} />
      <Tabs.Screen name="kanban" options={{ title: 'Kanban' }} />
    </Tabs>
  );
}
