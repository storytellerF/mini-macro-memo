import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getStatusLabel } from '@/services/download-history-service';
import type { DownloadRecord } from '@/types/download';
import { formatDateTime } from '@/utils/format';

type DownloadRecordCardProps = {
    record: DownloadRecord;
    onPress?: () => void;
};

export function DownloadRecordCard({ record, onPress }: DownloadRecordCardProps) {
    const countableAssets = record.assets.filter(asset => asset.qualityLabel?.toLowerCase() !== 'thumbnail');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);

    const copyUrl = async (assetId: string, url: string) => {
        await Clipboard.setStringAsync(url);
        setCopiedId(assetId);
        setTimeout(() => setCopiedId(prev => (prev === assetId ? null : prev)), 1500);
    };

    const copyAllUrls = async () => {
        const urls = countableAssets.map(asset => asset.url).join('\n');
        await Clipboard.setStringAsync(urls);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1500);
    };

    return (
        <ThemedView style={styles.card}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [styles.headerRow, onPress && pressed && styles.headerRowPressed]}
                disabled={!onPress}
            >
                <ThemedText type="defaultSemiBold">{getStatusLabel(record.status)}</ThemedText>
                <ThemedText style={styles.timestamp}>{formatDateTime(record.updatedAt)}</ThemedText>
            </Pressable>

            <ThemedText type="subtitle" style={styles.sectionTitle}>
                Links
            </ThemedText>
            {record.submittedLinks.map(link => (
                <ThemedText key={`${record.id}-${link}`} style={styles.linkText}>
                    {link}
                </ThemedText>
            ))}

            {record.authorNicknames && record.authorNicknames.length > 0 ? (
                <ThemedView style={styles.authorRow}>
                    <ThemedText type="defaultSemiBold" style={styles.authorLabel}>Author</ThemedText>
                    <ThemedText style={styles.authorValue}>{record.authorNicknames.join(', ')}</ThemedText>
                </ThemedView>
            ) : null}

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

            {countableAssets.length > 0 ? (
                <>
                    <ThemedView style={styles.mediaSectionHeader}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>
                            Media
                        </ThemedText>
                        <Pressable
                            onPress={copyAllUrls}
                            style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}
                            hitSlop={8}
                        >
                            <ThemedText style={styles.copyButtonText}>
                                {copiedAll ? 'Copied!' : 'Copy All'}
                            </ThemedText>
                        </Pressable>
                    </ThemedView>
                    {countableAssets.map(asset => (
                        <ThemedView key={asset.id} style={styles.assetRow}>
                            <ThemedView style={styles.assetInfo}>
                                <ThemedText type="defaultSemiBold" style={styles.assetLabel}>
                                    {asset.qualityLabel ?? asset.kind}
                                </ThemedText>
                                <ThemedText style={styles.assetUrl} numberOfLines={1} ellipsizeMode="middle">
                                    {asset.url}
                                </ThemedText>
                            </ThemedView>
                            <Pressable
                                onPress={() => copyUrl(asset.id, asset.url)}
                                style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}
                                hitSlop={8}
                            >
                                <ThemedText style={styles.copyButtonText}>
                                    {copiedId === asset.id ? 'Copied!' : 'Copy'}
                                </ThemedText>
                            </Pressable>
                        </ThemedView>
                    ))}
                </>
            ) : null}

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
    headerRowPressed: {
        opacity: 0.5,
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
    mediaSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    assetInfo: {
        flex: 1,
        gap: 2,
    },
    assetLabel: {
        fontSize: 13,
    },
    assetUrl: {
        fontSize: 12,
        opacity: 0.6,
    },
    copyButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#d0d7de',
    },
    copyButtonPressed: {
        opacity: 0.5,
    },
    copyButtonText: {
        fontSize: 12,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    authorLabel: {
        fontSize: 13,
    },
    authorValue: {
        fontSize: 13,
        flexShrink: 1,
    },
});