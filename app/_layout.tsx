import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useSegments } from 'expo-router';
import { View } from 'react-native';
import { FloatingNotesButton } from '../src/components/FloatingNotesButton';
import { AuthProvider, useSession } from '../src/lib/auth-context';

const queryClient = new QueryClient();

function RootNavigator() {
  const { session, isLoading } = useSession();
  const segments = useSegments();

  if (isLoading) return null;

  const showFloatingNotesButton = !!session && segments[0] !== 'notas';

  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="notas" options={{ presentation: 'modal', headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {showFloatingNotesButton ? <FloatingNotesButton /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
