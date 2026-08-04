import { Stack } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    // Optional Firebase — only if env is fully configured
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    if (!apiKey || !projectId) {
      console.log('[Potso Mobile] Guest mode — Firebase not configured');
      return;
    }
    try {
      // Dynamic import avoids crash when firebase package misconfigured
      import('firebase/app').then(({ initializeApp, getApps }) => {
        if (getApps().length === 0) {
          initializeApp({
            apiKey,
            authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId,
            storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
          });
        }
      }).catch((e) => console.warn('[Potso Mobile] Firebase skip', e));
    } catch (e) {
      console.warn('[Potso Mobile] Firebase skip', e);
    }
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#13c8ec',
        headerTitleStyle: { fontWeight: 'bold', color: '#ffffff' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
