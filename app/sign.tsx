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
  type Nip155Request,
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

export default function Nip155SignScreen() {
  const { u } = useLocalSearchParams<{ u?: string }>();
  const [req, setReq] = React.useState<Nip155Request | null>(null);
  const [previews, setPreviews] = React.useState<Array<{ label: string; value: string }>>([]);
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
      const sections: Array<{ label: string; value: string }> = [];
      if (parsed.type === 'sign_event' && parsed.eventJSON) {
        sections.push({ label: 'Event', value: safeDecodeAndFormat(parsed.eventJSON, pretty) });
      }
      if (parsed.type === 'nip04_encrypt' && parsed.plaintext) {
        sections.push({ label: 'Plaintext', value: safeDecode(parsed.plaintext) });
      }
      if (parsed.type === 'nip04_decrypt' && parsed.encryptedText) {
        sections.push({ label: 'Ciphertext', value: safeDecode(parsed.encryptedText) });
      }
      if (parsed.type === 'nip44_encrypt' && parsed.plaintext) {
        sections.push({ label: 'Plaintext', value: safeDecode(parsed.plaintext) });
      }
      if (parsed.type === 'nip44_decrypt' && parsed.encryptedText) {
        sections.push({ label: 'Ciphertext', value: safeDecode(parsed.encryptedText) });
      }
      if (parsed.pubkey) {
        sections.push({ label: 'Counterparty Pubkey', value: parsed.pubkey });
      }
      setPreviews(sections);
    } catch (e) {
      setError('Failed to parse request URL.');
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

      // If the client provided current_user and it mismatches our pubkey, surface as permission error.
      if (req.currentUser && req.currentUser.toLowerCase() !== pubHex.toLowerCase()) {
        const url = buildErrorUrl(req, 'permission_denied', 'current_user mismatch');
        if (url) await openUrl(url);
        return;
      }

      switch (req.type) {
        case 'get_public_key': {
          const npub = encodePublicKey(pubHex);
          const success = buildSuccessUrl(req, { pubkey: pubHex, npub });
          await openUrl(success);
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
          const key = pickReturnKey(req, 'event');
          const value = key === 'event' ? eventJson : sig;
          const success = buildSuccessUrl(req, { [key]: value });
          await openUrl(success);
          setReq(null);
          setPreviews([]);
          setStatus('Signed event dispatched to callback.');
          break;
        }
        case 'nip04_encrypt': {
          if (req.returnType && req.returnType !== 'ciphertext') {
            throw new Error('invalid_request: returnType must be ciphertext for nip04_encrypt');
          }
          if (!req.plaintext) throw new Error('invalid_request: missing plaintext');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const plaintext = safeDecode(req.plaintext);
          const ciphertext = encryptNIP04(privHex, req.pubkey, plaintext);
          const key = pickReturnKey(req, 'result');
          const success = buildSuccessUrl(req, { [key]: ciphertext });
          await openUrl(success);
          setReq(null);
          setPreviews([]);
          setStatus('Encrypted message dispatched.');
          break;
        }
        case 'nip04_decrypt': {
          if (req.returnType && req.returnType !== 'plaintext') {
            throw new Error('invalid_request: returnType must be plaintext for nip04_decrypt');
          }
          if (!req.encryptedText) throw new Error('invalid_request: missing encryptedText');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const encrypted = safeDecode(req.encryptedText);
          const plaintext = decryptNIP04(privHex, req.pubkey, encrypted);
          const key = pickReturnKey(req, 'result');
          const success = buildSuccessUrl(req, { [key]: plaintext });
          await openUrl(success);
          setReq(null);
          setPreviews([]);
          setStatus('Decrypted message dispatched.');
          break;
        }
        case 'nip44_encrypt': {
          if (req.returnType && req.returnType !== 'ciphertext') {
            throw new Error('invalid_request: returnType must be ciphertext for nip44_encrypt');
          }
          if (!req.plaintext) throw new Error('invalid_request: missing plaintext');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const plaintext = safeDecode(req.plaintext);
          const ciphertext = encryptNIP44(plaintext, privHex, req.pubkey);
          const key = pickReturnKey(req, 'result');
          const success = buildSuccessUrl(req, { [key]: ciphertext });
          await openUrl(success);
          setReq(null);
          setPreviews([]);
          setStatus('NIP-44 encryption dispatched.');
          break;
        }
        case 'nip44_decrypt': {
          if (req.returnType && req.returnType !== 'plaintext') {
            throw new Error('invalid_request: returnType must be plaintext for nip44_decrypt');
          }
          if (!req.encryptedText) throw new Error('invalid_request: missing encryptedText');
          if (!req.pubkey) throw new Error('invalid_request: missing pubkey');
          const encrypted = safeDecode(req.encryptedText);
          const plaintext = decryptNIP44(encrypted, privHex, req.pubkey);
          const key = pickReturnKey(req, 'result');
          const success = buildSuccessUrl(req, { [key]: plaintext });
          await openUrl(success);
          setReq(null);
          setPreviews([]);
          setStatus('NIP-44 decryption dispatched.');
          break;
        }
        default: {
          const url = buildErrorUrl(req, 'unsupported_method', `Method not supported: ${req.type}`);
          if (url) await openUrl(url);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'internal_error';
      setError(message);
      if (req) {
        const url = buildErrorUrl(req, 'internal_error', message);
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

function pickReturnKey(req: Nip155Request, fallback: string): string {
  switch (req.returnType) {
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
