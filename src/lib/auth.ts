export const AUTH_CONFIG = {
  defaultEmail: 'carloshenrq1245@gmail.com',
  defaultPassword: '12277891',
  cookieName: 'radar_session',
  sessionDays: 30,
};

const SECRET = process.env.SESSION_SECRET || 'radar-shopee-secret-key-carloshenrq-2026';

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(email: string): Promise<string> {
  const payload = {
    email,
    exp: Date.now() + AUTH_CONFIG.sessionDays * 24 * 60 * 60 * 1000,
  };

  const payloadStr = typeof btoa !== 'undefined'
    ? btoa(JSON.stringify(payload))
    : Buffer.from(JSON.stringify(payload)).toString('base64');

  const key = await getHmacKey();
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
  const hex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${payloadStr}.${hex}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<{ valid: boolean; email?: string }> {
  if (!token || typeof token !== 'string') return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [payloadStr, hexSignature] = parts;
  if (!payloadStr || !hexSignature) return { valid: false };

  try {
    const key = await getHmacKey();
    const enc = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
    const expectedSig = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSig !== hexSignature) {
      return { valid: false };
    }

    const decodedJson = typeof atob !== 'undefined'
      ? atob(payloadStr)
      : Buffer.from(payloadStr, 'base64').toString('utf-8');

    const payload = JSON.parse(decodedJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}

export function validateCredentials(emailInput: string, passwordInput: string): boolean {
  const validEmail = (process.env.ADMIN_EMAIL || AUTH_CONFIG.defaultEmail).toLowerCase().trim();
  const validPassword = process.env.ADMIN_PASSWORD || AUTH_CONFIG.defaultPassword;

  const inputEmail = (emailInput || '').toLowerCase().trim();
  const inputPass = (passwordInput || '').trim();

  return inputEmail === validEmail && inputPass === validPassword;
}
