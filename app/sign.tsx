import 'react-native-get-random-values';
import * as React from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams } from 'expo-router';
import { SECURE_KEY } from '@/lib/keys';
import {
  buildErrorUrl,
  buildSuccessUrl,
  describeRequest,
  isNip155Url,
  openUrl,
  parseNip155Url,
  type Nip155ErrorCode,
  type Nip155Request,
  type ReturnType,
} from '@/lib/nip155';
import {
  createEvent,
  encodePublicKey,
  decode,
  getPublicKey,
  encryptNIP04,
  decryptNIP04,
  encryptNIP44,
  decryptNIP44,
  getEventHash,
  signEvent,
} from 'snstr';

type EventLike = {
  kind: number;
  content: string;
  tags?: string[][];
  created_at?: number;
};

type PreviewSection = { label: string; value: string };

export default function Nip155SignScreen() {
  const { u } = useLocalSearchParams<{ u?: string }>();
  const [req, setReq] = React.useState<Nip155Request | null>(null);
  const [previews, setPreviews] = React.useState<PreviewSection[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    setError(null);
    setPreviews([]);
    setStatus(null);
    try {
      const raw = decodeURIComponent(u ?? '');
      if (!raw || !isNip155Url(raw)) {
        setError('No valid NIP-155 request in URL.');
        return;
      }
      const parsed = parseNip155Url(raw);
      setReq(parsed);
      setPreviews(buildPreviewSections(parsed));
    } catch (error) {
      setError(friendlyMessage(error, 'Failed to parse request URL.'));
    }
  }, [u]);

  const onReject = React.useCallback(async () => {
    if (!req) return;
    const url = buildErrorUrl(req, 'user_cancelled', 'User cancelled');
    if (url) await openUrl(url);
  }, [req]);

  const onApprove = React.useCallback(async () => {
    if (!req) return;
    setBusy(true);
    setError(null);
    try {
      const nsec = await SecureStore.getItemAsync(SECURE_KEY);
      if (!nsec) {
        const url = buildErrorUrl(req, 'not_logged_in', 'No signer configured');
        if (url) await openUrl(url);
        return;
      }

      const privHex = ensurePrivHex(nsec);
      const pubHex = getPublicKey(privHex);

      if (req.currentUser && req.currentUser.toLowerCase() !== pubHex.toLowerCase()) {
        const url = buildErrorUrl(req, 'permission_denied', 'current_user mismatch');
        if (url) await openUrl(url);
        return;
      }

      const sendSuccess = async (message: string, params: Record<string, string>) => {
        const success = buildSuccessUrl(req, params);
        await openUrl(success);
        setReq(null);
        setPreviews([]);
        setStatus(message);
      };

      switch (req.type) {
        case 'get_public_key': {
          const npub = encodePublicKey(pubHex);
          await sendSuccess('Shared public key with caller.', { pubkey: pubHex, npub });
          break;
        }
        case 'sign_event': {
          if (!req.eventJSON) throw new Error('invalid_request: missing event');
          const json = decodeURIComponent(req.eventJSON);
          const candidate = JSON.parse(json) as EventLike;
          // Ensure created_at and use our key
          if (!candidate.created_at) candidate.created_at = Math.floor(Date.now() / 1000);
          const unsigned = (createEvent as any)(
            {
              kind: candidate.kind,
              content: candidate.content,
              tags: candidate.tags ?? [],
              created_at: candidate.created_at,
            },
            pubHex
          );
          const event = { ...unsigned } as Record<string, unknown> & { pubkey: string };
          const id = await getEventHash(event as any);
          const sig = await signEvent(id, privHex);
          const signed = { ...event, id, sig };
          const eventJson = JSON.stringify(signed);
          const key = pickReturnKey(req, 'event', ['event', 'signature']);
          const value = key === 'event' ? eventJson : sig;
          await sendSuccess('Signed event dispatched to callback.', { [key]: value });
          break;
        }
        case 'nip04_encrypt': {
          if (!req.plaintext) throw new Error('invalid_request: missing plaintext');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const plaintext = safeDecode(req.plaintext);
          const ciphertext = encryptNIP04(privHex, req.pubkey, plaintext);
          const key = pickReturnKey(req, 'ciphertext', ['ciphertext']);
          await sendSuccess('Encrypted message dispatched.', { [key]: ciphertext });
          break;
        }
        case 'nip04_decrypt': {
          if (!req.encryptedText) throw new Error('invalid_request: missing encryptedText');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const encrypted = safeDecode(req.encryptedText);
          const plaintext = decryptNIP04(privHex, req.pubkey, encrypted);
          const key = pickReturnKey(req, 'plaintext', ['plaintext']);
          await sendSuccess('Decrypted message dispatched.', { [key]: plaintext });
          break;
        }
        case 'nip44_encrypt': {
          if (!req.plaintext) throw new Error('invalid_request: missing plaintext');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const plaintext = safeDecode(req.plaintext);
          const ciphertext = encryptNIP44(plaintext, privHex, req.pubkey);
          const key = pickReturnKey(req, 'ciphertext', ['ciphertext']);
          await sendSuccess('NIP-44 encryption dispatched.', { [key]: ciphertext });
          break;
        }
        case 'nip44_decrypt': {
          if (!req.encryptedText) throw new Error('invalid_request: missing encryptedText');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const encrypted = safeDecode(req.encryptedText);
          const plaintext = decryptNIP44(encrypted, privHex, req.pubkey);
          const key = pickReturnKey(req, 'plaintext', ['plaintext']);
          await sendSuccess('NIP-44 decryption dispatched.', { [key]: plaintext });
          break;
        }
        default: {
          const url = buildErrorUrl(req, 'unsupported_method', `Method not supported: ${req.type}`);
          if (url) await openUrl(url);
        }
      }
    } catch (error) {
      const details = normalizeError(error);
      setError(friendlyMessage(error, details.reason));
      if (req) {
        const url = buildErrorUrl(req, details.code, details.reason);
        if (url) await openUrl(url);
      }
    } finally {
      setBusy(false);
    }
  }, [req]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>NIP-155 Request</Text>
      {req ? <Text style={styles.subtitle}>{describeRequest(req)}</Text> : null}
      {previews.map((section, idx) => (
        <View key={`${section.label}-${idx}`} style={styles.previewBox}>
          <Text style={styles.previewLabel}>{section.label}</Text>
          <Text style={styles.mono}>{section.value}</Text>
        </View>
      ))}
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Button title="Reject" color="#b00020" onPress={onReject} disabled={!req || busy} />
        <View style={{ width: 12 }} />
        <Button title="Approve" onPress={onApprove} disabled={!req || busy} />
      </View>
      {req ? (
        <View style={styles.meta}>
          <Text style={styles.metaItem}>id: {req.id ?? '-'}</Text>
          <Text style={styles.metaItem}>returnType: {req.returnType ?? '-'}</Text>
          <Text style={styles.metaItem}>x-success: {req.xSuccess ?? '-'}</Text>
          <Text style={styles.metaItem}>x-error: {req.xError ?? '-'}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ensurePrivHex(nsec: string): string {
  const decoded = decode(nsec as `${string}1${string}`);
  if (decoded.type !== 'nsec' || typeof decoded.data !== 'string') {
    throw new Error('Stored signer is invalid');
  }
  return decoded.data;
}

function pretty(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeDecodeAndFormat(value: string, formatter: (input: string) => string): string {
  return formatter(safeDecode(value));
}

function buildPreviewSections(req: Nip155Request): PreviewSection[] {
  const sections: PreviewSection[] = [];
  if (req.eventJSON) {
    sections.push({ label: 'Event', value: safeDecodeAndFormat(req.eventJSON, pretty) });
  }
  if (req.plaintext) {
    sections.push({ label: 'Plaintext', value: safeDecode(req.plaintext) });
  }
  if (req.encryptedText) {
    sections.push({ label: 'Ciphertext', value: safeDecode(req.encryptedText) });
  }
  if (req.pubkey) {
    sections.push({ label: 'Counterparty Pubkey', value: req.pubkey });
  }
  return sections;
}

function pickReturnKey(req: Nip155Request, fallback: string, allowed?: ReturnType[]): string {
  const { returnType } = req;
  if (!returnType) {
    return fallback;
  }
  if (allowed && !allowed.includes(returnType)) {
    throw new Error(`invalid_request: returnType must be ${allowed.join(' or ')}`);
  }
  switch (returnType) {
    case 'event':
      return 'event';
    case 'signature':
      return 'result';
    case 'ciphertext':
      return 'ciphertext';
    case 'plaintext':
      return 'plaintext';
    default:
      return fallback;
  }
}

const ERROR_CODES: Nip155ErrorCode[] = [
  'user_cancelled',
  'permission_denied',
  'invalid_request',
  'unsupported_method',
  'payload_too_large',
  'not_logged_in',
  'rate_limited',
  'internal_error',
];

function normalizeError(error: unknown): { code: Nip155ErrorCode; reason: string } {
  if (error instanceof Error) {
    const [codePart, detail] = error.message.split(':', 2).map((part) => part.trim());
    if (codePart && (ERROR_CODES as ReadonlyArray<string>).includes(codePart)) {
      return { code: codePart as Nip155ErrorCode, reason: detail || codePart };
    }
    return { code: 'internal_error', reason: error.message };
  }
  return { code: 'internal_error', reason: 'Unexpected error' };
}

function friendlyMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }
  const [code, detail] = error.message.split(':', 2).map((part) => part.trim());
  if (!code) return fallback;
  switch (code) {
    case 'invalid_request':
      return detail ? `Invalid request: ${detail}` : 'Invalid request.';
    case 'unsupported_method':
      return detail ? `Unsupported method: ${detail}` : 'Unsupported method.';
    case 'payload_too_large':
      return detail ? `Payload too large: ${detail}` : 'Payload too large for this demo.';
    default:
      return error.message;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4a4a4a',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  error: {
    color: '#b00020',
    textAlign: 'center',
  },
  status: {
    color: '#166534',
    textAlign: 'center',
  },
  previewBox: {
    backgroundColor: '#f4f4f5',
    padding: 12,
    borderRadius: 8,
  },
  previewLabel: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#525252',
  },
  mono: {
    fontFamily: 'Courier',
  },
  meta: {
    marginTop: 12,
    gap: 4,
  },
  metaItem: {
    fontSize: 12,
    color: '#6b7280',
  },
});
