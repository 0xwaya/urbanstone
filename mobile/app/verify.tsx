import { verifyMagicLink } from '@/lib/api';
import { saveSession } from '@/lib/session';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Button from '@/components/ui/Button';

export default function VerifyScreen() {
  const { token, email } = useLocalSearchParams<{ token: string; email?: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No token found in the login link. Please request a new one.');
      return;
    }

    verifyMagicLink(token)
      .then(async result => {
        if (result.ok) {
          // Store session — use email param from deep link if available
          const resolvedEmail = email ?? '';
          await saveSession(token, resolvedEmail);
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(result.message ?? 'Verification failed. The link may have expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Check your connection and try again.');
      });
  }, [token, email]);

  if (status === 'verifying') {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-muted text-base">Verifying your login link…</Text>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-4xl mb-4">✓</Text>
        <Text className="text-foreground text-xl font-semibold mb-2 text-center">
          You're signed in
        </Text>
        <Text className="text-muted text-sm text-center mb-8">
          Welcome back to the Urban Stone contractor portal.
        </Text>
        <Button
          label="Go to Portal"
          onPress={() => router.replace('/(tabs)/contractor')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg items-center justify-center px-8">
      <Text className="text-3xl mb-4">✕</Text>
      <Text className="text-foreground text-xl font-semibold mb-2 text-center">
        Link Invalid
      </Text>
      <Text className="text-muted text-sm text-center mb-8">{message}</Text>
      <Button
        label="Back to Login"
        onPress={() => router.replace('/(tabs)/contractor')}
      />
    </View>
  );
}
