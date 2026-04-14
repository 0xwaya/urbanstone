import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0c1220' },
          headerTintColor: '#e7eef8',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#08080c' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="verify"
          options={{ title: 'Verifying Login', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
