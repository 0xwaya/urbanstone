const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+.\-\s]{7,24}$/;

export function validateEmail(v: string): string | null {
  if (!v.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePhone(v: string): string | null {
  if (!v.trim()) return 'Phone is required.';
  if (!PHONE_RE.test(v.trim())) return 'Enter a valid phone number.';
  return null;
}

export function validateName(v: string): string | null {
  if (v.trim().length < 2) return 'Enter your full name.';
  return null;
}

export function validateSqft(v: string): string | null {
  if (!v.trim()) return 'Enter total square footage.';
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return 'Enter a valid number.';
  if (n > 50000) return 'Square footage looks too high — please verify.';
  return null;
}
