/** Thin fetch wrapper around the existing Next.js API endpoints. */

const base = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (!url) throw new Error('EXPO_PUBLIC_API_URL is not set');
  return url.replace(/\/$/, '');
};

// ---------- Lead / Quote ----------

export interface LeadPayload {
  name: string;
  email: string;
  phone: string;
  totalSquareFootage: string;
  currentTopRemoval: string;
  currentTopMaterial: string;
  sinkBasinPreference: string;
  sinkMountPreference: string;
  sinkMaterialPreference: string;
  backsplashPreference: string;
  timeframeGoal: string;
  materialPreferences: string[];
  projectDetails?: string;
  routeId?: string;
  website?: string; // honeypot — must stay empty
}

export interface LeadResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  const res = await fetch(`${base()}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, routeId: 'mobile-app', website: '' }),
  });

  const json = await res.json().catch(() => ({}));

  if (res.ok) return { ok: true };
  return { ok: false, message: json.message ?? 'Submission failed.', errors: json.errors };
}

// ---------- Contractor auth ----------

export interface RequestLinkResult {
  ok: boolean;
  message?: string;
}

export async function requestMagicLink(email: string): Promise<RequestLinkResult> {
  const res = await fetch(`${base()}/api/contractor/request-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, message: json.message };
}

export interface VerifyResult {
  ok: boolean;
  token?: string;
  message?: string;
}

export async function verifyMagicLink(token: string): Promise<VerifyResult> {
  const res = await fetch(`${base()}/api/contractor/verify?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    credentials: 'omit',
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, token };
  return { ok: false, message: json.message ?? 'Verification failed.' };
}
