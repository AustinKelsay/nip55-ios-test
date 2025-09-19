import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { View, Text, StyleSheet, TextInput, Button } from 'react-native';
import {
  encodePrivateKey,
  encodePublicKey,
  generateKeypair,
  getPublicKey,
  decode,
} from 'snstr';
import { SECURE_KEY } from '@/lib/keys';

type DerivedKeys = {
  nsec: string;
  pubHex: string;
  npub: string;
};

function deriveKeys(nsec: string): DerivedKeys {
  const normalized = nsec.trim();
  if (!normalized) {
    throw new Error('Paste or generate an nsec value first.');
  }
  const decoded = decode(normalized as `${string}1${string}`);
  if (decoded.type !== 'nsec' || typeof decoded.data !== 'string') {
    throw new Error('Value must be a valid NIP-19 nsec.');
  }
  const privHex = decoded.data;
  const pubHex = getPublicKey(privHex);
  const npub = encodePublicKey(pubHex);
  return { nsec: normalized, pubHex, npub };
}

export default function SignerScreen() {
  const [nsecInput, setNsecInput] = React.useState('');
  const [keys, setKeys] = React.useState<DerivedKeys | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(SECURE_KEY);
        if (!saved || cancelled) return;
        try {
          const derived = deriveKeys(saved);
          if (cancelled) return;
          setKeys(derived);
          setNsecInput(derived.nsec);
          setStatus('Loaded saved signer.');
        } catch (err) {
          console.warn('Stored signer is invalid', err);
          if (!cancelled) {
            setError('Stored signer is invalid. Please save a new one.');
          }
        }
      } catch (err) {
        console.warn('SecureStore read failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetFeedback = React.useCallback(() => {
    setStatus(null);
    setError(null);
  }, []);

  const handleChange = React.useCallback(
    (value: string) => {
      setNsecInput(value);
      resetFeedback();
    },
    [resetFeedback],
  );

  const handleGenerate = React.useCallback(async () => {
    setBusy(true);
    resetFeedback();
    try {
      const { privateKey, publicKey } = await generateKeypair();
      const nsec = encodePrivateKey(privateKey);
      const derived: DerivedKeys = {
        nsec,
        pubHex: publicKey,
        npub: encodePublicKey(publicKey),
      };
      setNsecInput(derived.nsec);
      setKeys(derived);
      setStatus('Generated new signer (not saved yet).');
    } catch (err) {
      console.warn('Key generation failed', err);
      setError('Failed to generate a new signer.');
    } finally {
      setBusy(false);
    }
  }, [resetFeedback]);

  const handleSave = React.useCallback(async () => {
    const trimmed = nsecInput.trim();
    if (!trimmed) {
      setError('Paste or generate an nsec before saving.');
      setStatus(null);
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const derived = deriveKeys(trimmed);
      await SecureStore.setItemAsync(SECURE_KEY, derived.nsec);
      setKeys(derived);
      setStatus('Signer saved to device.');
    } catch (err) {
      console.warn('Save failed', err);
      setError(err instanceof Error ? err.message : 'Failed to save signer.');
    } finally {
      setBusy(false);
    }
  }, [nsecInput, resetFeedback]);

  const handleForget = React.useCallback(async () => {
    setBusy(true);
    resetFeedback();
    try {
      await SecureStore.deleteItemAsync(SECURE_KEY);
      setKeys(null);
      setNsecInput('');
      setStatus('Signer removed.');
    } catch (err) {
      console.warn('Forget signer failed', err);
      setError('Failed to remove saved signer.');
    } finally {
      setBusy(false);
    }
  }, [resetFeedback]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SNSTR Signer</Text>
      <Text style={styles.copy}>Paste an existing nsec or generate a new one, then save it locally.</Text>
      <TextInput
        value={nsecInput}
        onChangeText={handleChange}
        placeholder="nsec1..."
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        editable={!busy}
      />
      <View style={styles.actions}>
        <Button title="Generate nsec" onPress={handleGenerate} disabled={busy} />
        <View style={styles.gap} />
        <Button title="Save" onPress={handleSave} disabled={busy || !nsecInput.trim()} />
      </View>
      <View style={styles.secondaryAction}>
        <Button title="Forget saved signer" onPress={handleForget} disabled={busy || !keys} />
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {keys ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Derived identifiers</Text>
          <Text style={styles.mono}>{keys.npub}</Text>
          <Text style={styles.mono}>{keys.pubHex}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  copy: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4a4a4a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'System',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: {
    width: 12,
  },
  secondaryAction: {
    marginTop: 8,
  },
  status: {
    textAlign: 'center',
    color: '#1b5e20',
  },
  error: {
    textAlign: 'center',
    color: '#b00020',
  },
  preview: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    gap: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a4a4a',
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: 'Courier',
    textAlign: 'center',
  },
});
