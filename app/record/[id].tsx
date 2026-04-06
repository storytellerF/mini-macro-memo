import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getDownloadRecords, getStatusLabel } from '@/services/download-history-service';
import type { DownloadRecord } from '@/types/download';
import { formatDateTime } from '@/utils/format';

const RECORD_ID_DISPLAY_LENGTH = 8;
const BITS_PER_KILOBIT = 1000;

export default function RecordDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const navigation = useNavigation();
    const [record, setRecord] = useState<DownloadRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);

    const countableAssets = useMemo(
        () => record?.assets.filter(a => a.qualityLabel?.toLowerCase() !== 'thumbnail') ?? [],
        [record]
    );

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const records = await getDownloadRecords();
                const found = records.find(r => r.id === id) ?? null;
                if (isMounted) {
                    setRecord(found);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (record) {
            navigation.setOptions({ title: `Record ${record.id.slice(0, RECORD_ID_DISPLAY_LENGTH)}` });
        }
    }, [navigation, record]);

    const copyUrl = async (assetId: string, url: string) => {
        await Clipboard.setStringAsync(url);
        setCopiedId(assetId);
        setTimeout(() => setCopiedId(prev => (prev === assetId ? null : prev)), 1500);
    };

    const copyAllUrlsAlert = async () => {
        if (countableAssets.length === 0) {
            Alert.alert('Nothing to copy', 'No media URLs available.');
            return;
        }

        const urls = countableAssets.map(a => a.url).join('\n');
        await Clipboard.setStringAsync(urls);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1500);
        Alert.alert('Copied', `${countableAssets.length} media URL(s) copied to the clipboard.`);
    };

    if (loading) {
        return (
            <ThemedView style={styles.centered}>
                <ThemedText>Loading...</ThemedText>
            </ThemedView>
        );
    }

    if (!record) {
        return (
            <ThemedView style={styles.centered}>
                <ThemedText>Record not found.</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedView style={styles.section}>
                <ThemedView style={styles.headerRow}>
                    <ThemedText type="defaultSemiBold" style={styles.statusBadge}>
                        {getStatusLabel(record.status)}
                    </ThemedText>
                    <ThemedText style={styles.timestamp}>{formatDateTime(record.updatedAt)}</ThemedText>
                </ThemedView>
                <ThemedText style={styles.recordId} selectable>
                    ID: {record.id}
                </ThemedText>
            </ThemedView>

            <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Links
                </ThemedText>
                {record.submittedLinks.map((link, index) => (
                    <ThemedText key={`${record.id}-link-${index}`} style={styles.linkText} selectable>
                        {link}
                    </ThemedText>
                ))}
            </ThemedView>

            {record.authorNicknames && record.authorNicknames.length > 0 ? (
                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                        Author
                    </ThemedText>
                    <ThemedText>{record.authorNicknames.join(', ')}</ThemedText>
                </ThemedView>
            ) : null}

            <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Metadata
                </ThemedText>
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
                {record.platforms && record.platforms.length > 0 ? (
                    <ThemedView style={styles.metaItem}>
                        <ThemedText type="defaultSemiBold">Platforms</ThemedText>
                        <ThemedText>{record.platforms.join(', ')}</ThemedText>
                    </ThemedView>
                ) : null}
            </ThemedView>

            {record.platformRuns ? (
                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                        Platform Runs
                    </ThemedText>
                    {Object.entries(record.platformRuns).map(([platform, run]) =>
                        run.runId ? (
                            <ThemedView key={platform} style={styles.runItem}>
                                <ThemedText type="defaultSemiBold" style={styles.platformLabel}>
                                    {platform}
                                </ThemedText>
                                <ThemedText style={styles.runIdText} selectable>
                                    Run: {run.runId}
                                </ThemedText>
                                {run.datasetId ? (
                                    <ThemedText style={styles.runIdText} selectable>
                                        Dataset: {run.datasetId}
                                    </ThemedText>
                                ) : null}
                            </ThemedView>
                        ) : null
                    )}
                </ThemedView>
            ) : record.apifyRunId ? (
                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                        Run Info
                    </ThemedText>
                    <ThemedText style={styles.runIdText} selectable>
                        Run ID: {record.apifyRunId}
                    </ThemedText>
                    {record.apifyDatasetId ? (
                        <ThemedText style={styles.runIdText} selectable>
                            Dataset ID: {record.apifyDatasetId}
                        </ThemedText>
                    ) : null}
                </ThemedView>
            ) : null}

            {countableAssets.length > 0 ? (
                <ThemedView style={styles.section}>
                    <ThemedView style={styles.mediaSectionHeader}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>
                            Media
                        </ThemedText>
                        <Pressable
                            onPress={() => void copyAllUrlsAlert()}
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
                                {asset.width && asset.height ? (
                                    <ThemedText style={styles.assetMeta}>
                                        {asset.width}×{asset.height}
                                        {asset.bitrate ? `  ${Math.round(asset.bitrate / BITS_PER_KILOBIT)} kbps` : ''}
                                    </ThemedText>
                                ) : null}
                                <ThemedText style={styles.assetUrl} selectable>
                                    {asset.url}
                                </ThemedText>
                            </ThemedView>
                            <Pressable
                                onPress={() => void copyUrl(asset.id, asset.url)}
                                style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}
                                hitSlop={8}
                            >
                                <ThemedText style={styles.copyButtonText}>
                                    {copiedId === asset.id ? 'Copied!' : 'Copy'}
                                </ThemedText>
                            </Pressable>
                        </ThemedView>
                    ))}
                </ThemedView>
            ) : null}

            <ThemedView style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Timeline
                </ThemedText>
                <ThemedView style={styles.timelineItem}>
                    <ThemedText type="defaultSemiBold">Created</ThemedText>
                    <ThemedText>{formatDateTime(record.createdAt)}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.timelineItem}>
                    <ThemedText type="defaultSemiBold">Started</ThemedText>
                    <ThemedText>{formatDateTime(record.startedAt)}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.timelineItem}>
                    <ThemedText type="defaultSemiBold">Finished</ThemedText>
                    <ThemedText>{formatDateTime(record.finishedAt)}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.timelineItem}>
                    <ThemedText type="defaultSemiBold">Updated</ThemedText>
                    <ThemedText>{formatDateTime(record.updatedAt)}</ThemedText>
                </ThemedView>
            </ThemedView>

            {record.errorMessage ? (
                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                        Error
                    </ThemedText>
                    <ThemedText style={styles.errorText}>{record.errorMessage}</ThemedText>
                </ThemedView>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        padding: 16,
        gap: 12,
    },
    section: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#d0d7de',
        padding: 16,
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    statusBadge: {
        fontSize: 15,
    },
    timestamp: {
        fontSize: 12,
        opacity: 0.7,
    },
    recordId: {
        fontSize: 12,
        opacity: 0.5,
        fontVariant: ['tabular-nums'],
    },
    sectionTitle: {
        fontSize: 16,
    },
    linkText: {
        fontSize: 13,
        lineHeight: 20,
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
    platformLabel: {
        textTransform: 'capitalize',
        fontSize: 13,
    },
    runItem: {
        gap: 4,
        paddingVertical: 4,
    },
    runIdText: {
        fontSize: 12,
        opacity: 0.6,
        fontVariant: ['tabular-nums'],
    },
    mediaSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    assetRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingTop: 4,
    },
    assetInfo: {
        flex: 1,
        gap: 2,
    },
    assetLabel: {
        fontSize: 13,
    },
    assetMeta: {
        fontSize: 11,
        opacity: 0.5,
    },
    assetUrl: {
        fontSize: 12,
        opacity: 0.6,
        lineHeight: 18,
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
    timelineItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    errorText: {
        color: '#b42318',
        lineHeight: 20,
    },
});
