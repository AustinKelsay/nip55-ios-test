import * as Linking from 'expo-linking';

import { emitCallback } from './callbacks';

// Simple, minimal NIP-155 request representation for this demo
export type Nip155Method =
  | 'get_public_key'
  | 'sign_event'
  | 'nip04_encrypt'
  | 'nip04_decrypt'
  | 'nip44_encrypt'
  | 'nip44_decrypt'
  | 'decrypt_zap_event';

const SUPPORTED_METHODS: Record<string, Nip155Method> = {
  get_public_key: 'get_public_key',
  sign_event: 'sign_event',
  nip04_encrypt: 'nip04_encrypt',
  nip04_decrypt: 'nip04_decrypt',
  nip44_encrypt: 'nip44_encrypt',
  nip44_decrypt: 'nip44_decrypt',
  decrypt_zap_event: 'decrypt_zap_event',
};

function isSupportedMethod(value: string): value is Nip155Method {
  return value in SUPPORTED_METHODS;
}

export type ReturnType = 'signature' | 'event' | 'ciphertext' | 'plaintext';

export type CompressionType = 'none' | 'gzip';

export type Nip155Request = {
  type: Nip155Method;
  id?: string;
  xSuccess?: string;
  xError?: string;
  xCancel?: string;
  currentUser?: string; // hex pubkey from client
  returnType?: ReturnType;
  compressionType?: CompressionType; // only 'none' supported here; 'gzip' rejected
  // payloads (at most one relevant per method)
  eventJSON?: string; // url-encoded JSON string per spec
  plaintext?: string;
  encryptedText?: string;
  pubkey?: string; // hex
  // raw for diagnostics
  rawUrl: string;
};

export type Nip155ErrorCode =
  | 'user_cancelled'
  | 'permission_denied'
  | 'invalid_request'
  | 'unsupported_method'
  | 'payload_too_large'
  | 'not_logged_in'
  | 'rate_limited'
  | 'internal_error';

export function isNip155Url(url: string): boolean {
  // Accept generic and app-specific scheme for this demo
  if (!url) return false;
  try {
    const parsed = Linking.parse(url);
    const scheme = parsed.scheme || '';
    const host = ((parsed as any).host || (parsed as any).hostname || '') as string;
    const path = parsed.path || '';
    const method = (parsed.queryParams?.type || '') as string;
    if (!scheme) return false;
    if (host === 'debug' || path.startsWith('debug/')) {
      return false;
    }
    if (scheme === 'nostrsigner' || scheme === 'nip55-ios-test') {
      return true;
    }
    if (scheme === 'exp') {
      const candidate = method || path;
      return candidate ? isSupportedMethod(candidate) : false;
    }
    return false;
  } catch (err) {
    console.warn('isNip155Url parse error', url, err);
    return false;
  }
}

export function parseNip155Url(url: string): Nip155Request {
  const parsed = Linking.parse(url);
  // Linking.parse returns object with path and queryParams
  const qp = (parsed.queryParams ?? {}) as Record<string, unknown>;
  // Normalize access
  const get = (k: string) => (qp[k] ?? undefined) as string | undefined;

  const rawType = (get('type') || parsed.path || '').trim();
  const type = rawType as Nip155Method;
  if (!rawType) {
    throw new Error('invalid_request: missing type');
  }
  if (!isSupportedMethod(rawType)) {
    return {
      type: 'unsupported_method' as Nip155Method,
      rawUrl: url,
    } as Nip155Request;
  }

  const compressionType = (get('compressionType') as CompressionType | undefined) || 'none';
  if (compressionType !== 'none') {
    // Keep it simple for now; surface a clear message for the UI
    throw new Error('payload_too_large: compressionType not supported in this demo');
  }

  const req: Nip155Request = {
    type,
    id: get('id'),
    xSuccess: get('x-success') || get('xSuccess') || undefined,
    xError: get('x-error') || get('xError') || undefined,
    xCancel: get('x-cancel') || get('xCancel') || undefined,
    currentUser: get('current_user') || undefined,
    returnType: (get('returnType') as ReturnType | undefined) || undefined,
    compressionType,
    eventJSON: get('event') || undefined,
    plaintext: get('plaintext') || undefined,
    encryptedText: get('encryptedText') || undefined,
    pubkey: get('pubkey') || undefined,
    rawUrl: url,
  };

  return req;
}

export function buildSuccessUrl(req: Nip155Request, params: Record<string, string>): string {
  if (!req.xSuccess) throw new Error('No x-success provided');
  const base = req.xSuccess;
  const usp = new URLSearchParams();
  if (req.id) usp.set('id', String(req.id));
  for (const [k, v] of Object.entries(params)) {
    if (v != null) usp.set(k, v);
  }
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}${usp.toString()}`;
}

export function buildErrorUrl(
  req: Nip155Request,
  code: Nip155ErrorCode,
  reason: string
): string | null {
  const base = req.xError || req.xCancel || null;
  if (!base) return null;
  const usp = new URLSearchParams();
  usp.set('code', code);
  usp.set('reason', reason);
  if (req.id) usp.set('id', String(req.id));
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}${usp.toString()}`;
}

export async function openUrl(url: string): Promise<void> {
  console.log('[NIP155] dispatch callback', url);
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      console.log('[NIP155] native openURL', url);
      await Linking.openURL(url);
      return;
    }
  } catch (err) {
    console.warn('Failed to open callback URL', url, err);
  }
  console.log('[NIP155] emit fallback', url);
  emitCallback(url);
}

export function describeRequest(req: Nip155Request): string {
  switch (req.type) {
    case 'get_public_key':
      return 'Request: get_public_key (return pubkey for current account)';
    case 'sign_event':
      return 'Request: sign_event (sign the provided event JSON)';
    case 'nip04_encrypt':
      return 'Request: nip04_encrypt (encrypt a message with shared secret)';
    case 'nip04_decrypt':
      return 'Request: nip04_decrypt (decrypt a message with shared secret)';
    case 'nip44_encrypt':
      return 'Request: nip44_encrypt (encrypt a message using NIP-44)';
    case 'nip44_decrypt':
      return 'Request: nip44_decrypt (decrypt a message using NIP-44)';
    case 'decrypt_zap_event':
      return 'Request: decrypt_zap_event (decrypt a zap event)';
    default:
      return 'Unknown request';
  }
}
