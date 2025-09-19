import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';

function decodeValue(value?: string) {
  if (!value) return '-';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function DebugSuccessScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    reason?: string;
    id?: string;
    event?: string;
  }>();
  const router = useRouter();
  const eventJson = React.useMemo(() => {
    const decoded = decodeValue(params.event);
    try {
      return JSON.stringify(JSON.parse(decoded), null, 2);
    } catch {
      return decoded;
    }
  }, [params.event]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Callback Received</Text>
      <Text style={styles.subtitle}>The NIP-155 request completed successfully.</Text>
      <View style={styles.card}>
        <Row label="id" value={decodeValue(params.id)} />
        <Row label="code" value={decodeValue(params.code) || 'success'} />
        <Row label="reason" value={decodeValue(params.reason) || 'n/a'} />
      </View>
      {params.event ? (
        <View style={styles.eventBox}>
          <Text style={styles.eventLabel}>event payload</Text>
          <Text style={styles.eventMono}>{eventJson}</Text>
        </View>
      ) : null}
      <Button title="Back to Home" onPress={() => router.replace('/(tabs)' as never)} />
    </ScrollView>
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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#4a4a4a',
  },
  card: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontWeight: '600',
    color: '#525252',
  },
  rowValue: {
    fontFamily: 'Courier',
  },
  eventBox: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
  },
  eventLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  eventMono: {
    fontFamily: 'Courier',
  },
});
