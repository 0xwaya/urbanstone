import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import { requestMagicLink } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';
import { validateEmail } from '@/lib/validation';
import { useFocusEffect } from 'expo-router';

type PortalState = 'loading' | 'login' | 'link-sent' | 'logged-in';

export default function ContractorScreen() {
  const [state, setState] = useState<PortalState>('loading');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');

  const checkSession = useCallback(async () => {
    const s = await getSession();
    if (s) {
      setSessionEmail(s.email);
      setState('logged-in');
    } else {
      setState('login');
    }
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  // Re-check session when tab comes into focus (e.g. after deep link verify)
  useFocusEffect(useCallback(() => { checkSession(); }, [checkSession]));

  const handleRequestLink = async () => {
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    setEmailError(null);
    setLoading(true);
    try {
      const result = await requestMagicLink(email.trim().toLowerCase());
      if (result.ok) {
        setState('link-sent');
      } else {
        Alert.alert('Error', result.message ?? 'Could not send link. Try again.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    setEmail('');
    setState('login');
  };

  // ---- Render states ----

  if (state === 'loading') {
    return <View className="flex-1 bg-bg" />;
  }

  if (state === 'link-sent') {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-3xl mb-4">✉️</Text>
        <Text className="text-foreground text-xl font-semibold mb-2 text-center">
          Check your inbox
        </Text>
        <Text className="text-muted text-sm text-center mb-6">
          A login link was sent to {email}. Tap it to sign in — the link is valid for 15 minutes.
        </Text>
        <Button
          label="Back to Login"
          variant="outline"
          onPress={() => setState('login')}
        />
      </View>
    );
  }

  if (state === 'logged-in') {
    return (
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerStyle={{ padding: 24 }}
      >
        <View className="mb-8">
          <Text className="text-foreground text-2xl font-semibold mb-1">
            Contractor Portal
          </Text>
          <Text className="text-muted text-sm">{sessionEmail}</Text>
        </View>

        <View className="bg-panel border border-border rounded-2xl p-5 mb-4">
          <Text className="text-accent text-xs uppercase tracking-widest mb-2">
            Commercial Estimates
          </Text>
          <Text className="text-foreground text-base font-medium mb-1">
            Full estimate tool
          </Text>
          <Text className="text-muted text-sm">
            Coming in the next release — use the web portal at urbanstone.co/contractors for full access.
          </Text>
        </View>

        <View className="bg-panel border border-border rounded-2xl p-5 mb-6">
          <Text className="text-accent text-xs uppercase tracking-widest mb-2">Pricing</Text>
          <Text className="text-muted text-sm">
            Commercial tier pricing is available on the full web portal.
          </Text>
        </View>

        <Button label="Sign Out" variant="outline" onPress={handleLogout} />
      </ScrollView>
    );
  }

  // Login screen
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
          <Text className="text-foreground text-2xl font-semibold mb-1">
            Contractor Portal
          </Text>
          <Text className="text-muted text-sm">
            Enter your approved contractor email to receive a login link.
          </Text>
        </View>

        <Field
          label="Email Address"
          value={email}
          onChangeText={v => { setEmail(v); setEmailError(null); }}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={handleRequestLink}
        />

        <Button
          label="Send Login Link"
          onPress={handleRequestLink}
          loading={loading}
        />

        <Text className="text-muted text-xs text-center mt-4">
          Access is limited to pre-approved contractors.{'\n'}
          Contact us at hello@urbanstone.co to apply.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
