import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SECURE_KEY } from '@/lib/keys';
import { Link } from 'expo-router';

export default function SettingsScreen() {
  async function onResetSigner() {
    await SecureStore.deleteItemAsync(SECURE_KEY);
    Alert.alert('Reset complete', 'Signer key removed from secure storage.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Minimal controls for now.</Text>
      <View style={{ height: 12 }} />
      <Button title="Reset signer" onPress={onResetSigner} />
      <View style={{ height: 8 }} />
      <Link href="/(tabs)" style={styles.link}>Back to Home</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  link: {
    color: '#3b82f6',
    fontWeight: '600',
  }
});
