import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'urbanstone_contractor_token';
const EMAIL_KEY   = 'urbanstone_contractor_email';

export async function saveSession(token: string, email: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, token);
  await SecureStore.setItemAsync(EMAIL_KEY, email);
}

export async function getSession(): Promise<{ token: string; email: string } | null> {
  const token = await SecureStore.getItemAsync(SESSION_KEY);
  const email = await SecureStore.getItemAsync(EMAIL_KEY);
  if (!token || !email) return null;
  return { token, email };
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}
