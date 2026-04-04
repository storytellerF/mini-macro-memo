import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, TextInput } from 'react-native';

import { DownloadRecordCard } from '@/components/download-record-card';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDownloadHistory } from '@/hooks/use-download-history';
import { useSecureString } from '@/hooks/use-secure-string';
import { Image } from 'expo-image';

export default function DownloadScreen() {
  const [text, setText] = useState('');
  const { value: token, loading: tokenLoading, reload: reloadToken } = useSecureString('apifyToken');

  useFocusEffect(useCallback(() => { void reloadToken(); }, [reloadToken]));
  const { records, submitting, errorMessage, activeRecordCount, submitLinks } = useDownloadHistory(token);

  const startDownload = async () => {
    try {
      const result = await submitLinks(text);
      setText('');
      Alert.alert('Queued', `${result.linkCount} link(s) submitted to Apify.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start download.';
      Alert.alert('Download failed', message);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F4D35E', dark: '#5C4742' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.panel}>
        <ThemedText type="title">Download</ThemedText>
        <ThemedText>
          Paste one or more Xiaohongshu URLs. Each whitespace-separated URL will be sent in one Apify async run.
        </ThemedText>
        <TextInput
          editable={!tokenLoading && !submitting}
          multiline
          numberOfLines={6}
          onChangeText={setText}
          placeholder="https://www.xiaohongshu.com/explore/..."
          style={styles.textArea}
          value={text}
        />
        <Button disabled={tokenLoading || submitting} onPress={startDownload} title={submitting ? 'Submitting...' : 'Start async download'} />
        {!token ? (
          <ThemedText>
            No token configured. Open <Link href="/setting">Settings</Link> first.
          </ThemedText>
        ) : null}
        <ThemedText>Active runs: {activeRecordCount}</ThemedText>
        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.historySection}>
        <ThemedText type="subtitle">Recent records</ThemedText>
        {records.length === 0 ? (
          <ThemedText>No downloads submitted yet.</ThemedText>
        ) : (
          records.slice(0, 3).map(record => <DownloadRecordCard key={record.id} record={record} />)
        )}
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
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  textArea: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#98a2b3',
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
  },
  historySection: {
    gap: 16,
  },
  errorText: {
    color: '#b42318',
  },
});

