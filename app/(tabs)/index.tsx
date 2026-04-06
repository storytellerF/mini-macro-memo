import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Button, StyleSheet } from 'react-native';

import { DownloadRecordCard } from '@/components/download-record-card';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDownloadHistory } from '@/hooks/use-download-history';
import { useSecureString } from '@/hooks/use-secure-string';

export default function HomeScreen() {
  const { value: token } = useSecureString('apifyToken');
  const { records, loading, refreshing, errorMessage, refreshPending, exportResult, activeRecordCount, isPolling } =
    useDownloadHistory(token);
  const router = useRouter();

  const exportAll = async () => {
    if (!exportResult.text) {
      Alert.alert('Nothing to export', 'No image or video URLs are available yet.');
      return;
    }

    await Clipboard.setStringAsync(exportResult.text);
    Alert.alert('Copied', `${exportResult.count} deduplicated media URL(s) copied to the clipboard.`);
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
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Download History</ThemedText>
      </ThemedView>
      <ThemedView style={styles.summaryCard}>
        <ThemedText>All async download runs are listed here.</ThemedText>
        <ThemedText>Records: {records.length}</ThemedText>
        <ThemedText>Active runs: {activeRecordCount}</ThemedText>
        <ThemedText>Exportable assets: {exportResult.count}</ThemedText>
        <ThemedView style={styles.buttonRow}>
          <ThemedView style={styles.buttonItem}>
            <Button onPress={() => void refreshPending()} title={refreshing ? 'Refreshing...' : 'Refresh status'} />
          </ThemedView>
          <ThemedView style={styles.buttonItem}>
            <Button onPress={() => void exportAll()} title="Copy all media URLs" />
          </ThemedView>
        </ThemedView>
        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">All records</ThemedText>
        {loading ? <ThemedText>Loading history...</ThemedText> : null}
        {!loading && records.length === 0 ? (
          <ThemedText>No download history yet. Start a run from the Download tab.</ThemedText>
        ) : null}
        {records.map(record => (
          <DownloadRecordCard
            key={record.id}
            record={record}
            onPress={() => router.push(`/record/${record.id}`)}
          />
        ))}
      </ThemedView>
      {isPolling ? (
        <ThemedView pointerEvents="none" style={styles.pollingToast}>
          <ThemedText style={styles.pollingToastText}>Refreshing run status in background...</ThemedText>
        </ThemedView>
      ) : null}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  summaryCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d0d7de',
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  buttonItem: {
    flexGrow: 1,
    minWidth: 160,
  },
  errorText: {
    color: '#b42318',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  pollingToast: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pollingToastText: {
    color: '#f9fafb',
    fontSize: 12,
  },
});
