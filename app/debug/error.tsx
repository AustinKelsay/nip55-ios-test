import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

function decodeValue(value?: string) {
  if (!value) return '-';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function DebugErrorScreen() {
  const params = useLocalSearchParams<{ code?: string; reason?: string; id?: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Callback Error</Text>
      <View style={styles.card}>
        <Row label="id" value={decodeValue(params.id)} />
        <Row label="code" value={decodeValue(params.code) || 'unknown'} />
        <Row label="reason" value={decodeValue(params.reason) || 'n/a'} />
      </View>
      <Button title="Back to Home" onPress={() => router.replace('/(tabs)' as never)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#b91c1c',
  },
  card: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontWeight: '600',
    color: '#7f1d1d',
  },
  rowValue: {
    fontFamily: 'Courier',
  },
});
