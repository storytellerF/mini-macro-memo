import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, TextInput } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSecureString } from '@/hooks/use-secure-string';

export default function SettingScreen() {
  const { value, loading, saveValue, clearValue } = useSecureString('apifyToken');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const saveToken = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      Alert.alert('Token required', 'Enter your Apify token before saving.');
      return;
    }

    await saveValue(trimmed);
    Alert.alert('Saved', 'Apify token saved securely on this device.');
  };

  const clearToken = async () => {
    await clearValue();
    setDraft('');
    Alert.alert('Cleared', 'Stored token has been removed.');
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.panel}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText>
          Store your Apify token securely to enable async Xiaohongshu downloads.
        </ThemedText>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          onChangeText={setDraft}
          placeholder="apify_api_xxxxxxxxx"
          secureTextEntry
          style={styles.input}
          value={draft}
        />
        <ThemedText>
          Status: {value ? 'Token saved in secure storage.' : 'No token saved yet.'}
        </ThemedText>
        <ThemedView style={styles.buttonRow}>
          <Button onPress={saveToken} title="Save token" />
          <Button color="#b42318" onPress={clearToken} title="Clear token" />
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  panel: {
    gap: 16,
    borderRadius: 16,
    borderColor: '#d0d7de',
    borderWidth: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#98a2b3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
