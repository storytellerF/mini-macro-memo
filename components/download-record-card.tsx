import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getStatusLabel } from '@/services/download-history-service';
import type { DownloadRecord } from '@/types/download';

type DownloadRecordCardProps = {
    record: DownloadRecord;
};

function formatDateTime(value?: string) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

export function DownloadRecordCard({ record }: DownloadRecordCardProps) {
    const countableAssets = record.assets.filter(asset => asset.qualityLabel?.toLowerCase() !== 'thumbnail');

    return (
        <ThemedView style={styles.card}>
            <ThemedView style={styles.headerRow}>
                <ThemedText type="defaultSemiBold">{getStatusLabel(record.status)}</ThemedText>
                <ThemedText style={styles.timestamp}>{formatDateTime(record.updatedAt)}</ThemedText>
            </ThemedView>

            <ThemedText type="subtitle" style={styles.sectionTitle}>
                Links
            </ThemedText>
            {record.submittedLinks.map(link => (
                <ThemedText key={`${record.id}-${link}`} style={styles.linkText}>
                    {link}
                </ThemedText>
            ))}

            <ThemedView style={styles.metaGrid}>
                <ThemedView style={styles.metaItem}>
                    <ThemedText type="defaultSemiBold">Images</ThemedText>
                    <ThemedText>{record.hasImages ? 'Yes' : 'No'}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.metaItem}>
                    <ThemedText type="defaultSemiBold">Videos</ThemedText>
                    <ThemedText>{record.hasVideos ? 'Yes' : 'No'}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.metaItem}>
                    <ThemedText type="defaultSemiBold">Assets</ThemedText>
                    <ThemedText>{countableAssets.length}</ThemedText>
                </ThemedView>
            </ThemedView>

            <ThemedText type="subtitle" style={styles.sectionTitle}>
                Timeline
            </ThemedText>
            <ThemedText>Started: {formatDateTime(record.startedAt ?? record.createdAt)}</ThemedText>
            <ThemedText>Finished: {formatDateTime(record.finishedAt)}</ThemedText>

            {record.errorMessage ? (
                <ThemedText style={styles.errorText}>Error: {record.errorMessage}</ThemedText>
            ) : null}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#d0d7de',
        padding: 16,
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    timestamp: {
        fontSize: 12,
        opacity: 0.7,
    },
    sectionTitle: {
        fontSize: 16,
    },
    linkText: {
        fontSize: 13,
        lineHeight: 18,
    },
    metaGrid: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    metaItem: {
        minWidth: 80,
        gap: 4,
    },
    errorText: {
        color: '#b42318',
    },
});