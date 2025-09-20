import * as Linking from 'expo-linking';

import { emitCallback } from './callbacks';

const METHODS = [
  'get_public_key',
  'sign_event',
  'nip04_encrypt',
  'nip04_decrypt',
  'nip44_encrypt',
  'nip44_decrypt',
  'decrypt_zap_event',
] as const;

export type Nip155Method = (typeof METHODS)[number];

const METHOD_SET = new Set<string>(METHODS);
const KNOWN_SCHEMES = new Set(['nostrsigner', 'nip55-ios-test']);

export type ReturnType = 'signature' | 'event' | 'ciphertext' | 'plaintext';
export type CompressionType = 'none' | 'gzip';

export type Nip155Request = {
  type: Nip155Method;
  id?: string;
  xSuccess?: string;
  xError?: string;
  xCancel?: string;
  currentUser?: string;
  returnType?: ReturnType;
  compressionType?: CompressionType;
  eventJSON?: string;
  plaintext?: string;
  encryptedText?: string;
  pubkey?: string;
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

const DESCRIPTIONS: Record<Nip155Method, string> = {
  get_public_key: 'Request: get_public_key (return pubkey for current account)',
  sign_event: 'Request: sign_event (sign the provided event JSON)',
  nip04_encrypt: 'Request: nip04_encrypt (encrypt a message with shared secret)',
  nip04_decrypt: 'Request: nip04_decrypt (decrypt a message with shared secret)',
  nip44_encrypt: 'Request: nip44_encrypt (encrypt a message using NIP-44)',
  nip44_decrypt: 'Request: nip44_decrypt (decrypt a message using NIP-44)',
  decrypt_zap_event: 'Request: decrypt_zap_event (decrypt a zap event)',
};

const RETURN_TYPES = new Set<ReturnType>(['signature', 'event', 'ciphertext', 'plaintext']);

function getHost(parsed: Record<string, unknown>): string {
  const value = parsed.host ?? (parsed as Record<string, unknown>).hostname;
  return typeof value === 'string' ? value : '';
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function pickType(parsed: Record<string, unknown>): string {
  const qp = (parsed.queryParams ?? {}) as Record<string, unknown>;
  const fromQuery = asString((qp as Record<string, unknown>).type);
  const fromPath = asString(parsed.path as string | undefined);
  return (fromQuery || fromPath || '').replace(/^\/+/, '');
}

export function isNip155Url(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = Linking.parse(url) as Record<string, unknown>;
    const scheme = (parsed.scheme as string | undefined) ?? '';
    const host = getHost(parsed);
    const path = asString(parsed.path) ?? '';
    if (!scheme || host === 'debug' || path.startsWith('debug/')) {
      return false;
    }
    if (KNOWN_SCHEMES.has(scheme)) {
      return true;
    }
    if (scheme === 'exp') {
      const candidate = pickType(parsed);
      return candidate ? METHOD_SET.has(candidate) : false;
    }
    return false;
  } catch (error) {
    console.warn('isNip155Url parse error', { url, error });
    return false;
  }
}

export function parseNip155Url(url: string): Nip155Request {
  const parsed = Linking.parse(url) as Record<string, unknown>;
  const qp = (parsed.queryParams ?? {}) as Record<string, unknown>;

  const rawType = pickType(parsed);
  if (!rawType) {
    throw new Error('invalid_request: missing type');
  }
  if (!METHOD_SET.has(rawType)) {
    throw new Error(`unsupported_method: ${rawType}`);
  }

  const compressionType = (asString(qp.compressionType) as CompressionType | undefined) || 'none';
  if (compressionType !== 'none') {
    throw new Error('payload_too_large: compressionType not supported in this demo');
  }

  const req: Nip155Request = {
    type: rawType as Nip155Method,
    id: asString(qp.id),
    xSuccess: asString(qp['x-success'] ?? (qp as any).xSuccess),
    xError: asString(qp['x-error'] ?? (qp as any).xError),
    xCancel: asString(qp['x-cancel'] ?? (qp as any).xCancel),
    currentUser: asString(qp.current_user ?? (qp as any).currentUser),
    returnType: (asString(qp.returnType) as ReturnType | undefined) || undefined,
    compressionType,
    eventJSON: asString(qp.event),
    plaintext: asString(qp.plaintext),
    encryptedText: asString(qp.encryptedText),
    pubkey: asString(qp.pubkey),
    rawUrl: url,
  };

  if (req.returnType && !RETURN_TYPES.has(req.returnType)) {
    throw new Error(`invalid_request: unsupported returnType ${req.returnType}`);
  }

  return req;
}

export function buildSuccessUrl(req: Nip155Request, params: Record<string, string>): string {
  if (!req.xSuccess) throw new Error('No x-success provided');
  const usp = new URLSearchParams();
  if (req.id) usp.set('id', req.id);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      usp.set(key, value);
    }
  }
  const glue = req.xSuccess.includes('?') ? '&' : '?';
  return `${req.xSuccess}${glue}${usp.toString()}`;
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
  if (req.id) usp.set('id', req.id);
  const glue = base.includes('?') ? '&' : '?';
  return `${base}${glue}${usp.toString()}`;
}

export async function openUrl(url: string): Promise<void> {
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
  } catch (error) {
    console.warn('Failed to open callback URL', { url, error });
  }
  emitCallback(url);
}

export function describeRequest(req: Nip155Request): string {
  return DESCRIPTIONS[req.type];
}
