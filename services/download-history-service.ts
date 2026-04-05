import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDatasetItems, getRun, mapApifyStatus, submitDownloadJob } from '@/services/apify-service';
import type { DownloadAsset, DownloadRecord, DownloadStatus, ExportResult, Platform } from '@/types/download';

export type GroupedLinks = {
  douyin: string[];
  xiaohongshu: string[];
};

const STORAGE_KEY = 'downloadHistoryRecords';
const ACTIVE_STATUSES: DownloadStatus[] = ['queued', 'running'];
const QUALITY_RANKS: Record<string, number> = {
  NW_X265_MP4: 7000,
  NW_X264_MP4: 6500,
  HD_X265_MP4: 6200,
  HD_X264_MP4: 6000,
  WM_X265_MP4: 5500,
  WM_X264_MP4: 5000,
  SD_X264_MP4: 4000,
};

type RawMedia = {
  url?: string;
  quality?: string;
  extension?: string;
  type?: string;
  width?: number | string;
  height?: number | string;
  bitrate?: number | string;
};

type RawResult = {
  url?: string;
  source?: string;
  author?: string;
  title?: string;
  thumbnail?: string;
  duration?: number | string;
  medias?: RawMedia[];
  images?: (string | { url?: string; width?: number | string; height?: number | string })[];
  type?: string;
  error?: boolean | string;
  status?: number | string;
  message?: string;
  time_end?: number | string;
};

type RawDatasetItem = {
  url?: string;
  result?: RawResult;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeParseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function inferKindFromPath(path: string[]) {
  const joined = path.join('.').toLowerCase();
  if (/(video|playaddr|stream|mp4|m3u8|dash)/.test(joined)) {
    return 'video';
  }

  if (/(image|img|cover|photo|picture|thumbnail|poster|avatar)/.test(joined)) {
    return 'image';
  }

  return undefined;
}

function inferKindFromUrl(url: string) {
  const lower = url.toLowerCase();
  if (/(\.mp4|\.m3u8|\.mov|\.webm)(\?|$)/.test(lower)) {
    return 'video';
  }

  if (/(\.jpg|\.jpeg|\.png|\.webp|\.heic|\.gif)(\?|$)/.test(lower)) {
    return 'image';
  }

  return undefined;
}

function canonicalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const filename = parsed.pathname
      .split('/')
      .filter(Boolean)
      .pop() ?? parsed.pathname;
    const normalizedFilename = filename
      .replace(/!.*$/, '')
      .replace(/([_-])(\d{3,4}p?|\d+x\d+)(?=\.)/gi, '')
      .replace(/_\d+(?=\.)/g, '');
    const compactPath = parsed.pathname.replace(filename, normalizedFilename).replace(/\/+/g, '/');

    if (normalizedFilename.length >= 12) {
      return normalizedFilename.toLowerCase();
    }

    return `${parsed.hostname}${compactPath}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function scoreQuality(source: { width?: number; height?: number; bitrate?: number; qualityLabel?: string; url: string }) {
  const width = source.width ?? 0;
  const height = source.height ?? 0;
  const bitrate = source.bitrate ?? 0;
  const labelScore = source.qualityLabel
    ? ((QUALITY_RANKS[source.qualityLabel] ?? Number(source.qualityLabel.replace(/[^\d]/g, ''))) || 0)
    : 0;
  const extensionScore = /\.m3u8(\?|$)/i.test(source.url) ? 1 : 0;

  return width * height + bitrate + labelScore * 1000 + extensionScore;
}

function asUrl(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function extractAssets(value: unknown, path: string[] = [], sourceLink?: string): DownloadAsset[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => extractAssets(item, [...path, String(index)], sourceLink));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const assets: DownloadAsset[] = [];
  const width = safeParseNumber(record.width ?? record.w ?? record.videoWidth ?? record.imageWidth);
  const height = safeParseNumber(record.height ?? record.h ?? record.videoHeight ?? record.imageHeight);
  const bitrate = safeParseNumber(record.bitrate ?? record.avgBitrate ?? record.videoBitrate);
  const durationSeconds = safeParseNumber(record.duration ?? record.durationSeconds ?? record.videoDuration);
  const qualityLabel = typeof record.quality === 'string'
    ? record.quality
    : typeof record.definition === 'string'
      ? record.definition
      : typeof record.qualityLabel === 'string'
        ? record.qualityLabel
        : undefined;
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : undefined;
  const inferredKind = inferKindFromPath(path);

  Object.entries(record).forEach(([key, nestedValue]) => {
    const url = asUrl(nestedValue);

    if (url) {
      const kind = inferredKind ?? inferKindFromPath([...path, key]) ?? inferKindFromUrl(url);
      if (kind) {
        assets.push({
          id: createId(),
          kind,
          url,
          canonicalUrl: canonicalizeUrl(url),
          qualityScore: scoreQuality({ width, height, bitrate, qualityLabel, url }),
          width,
          height,
          bitrate,
          durationSeconds,
          qualityLabel,
          mimeType,
          sourceLink,
        });
      }
    }

    if (nestedValue && typeof nestedValue === 'object') {
      assets.push(...extractAssets(nestedValue, [...path, key], sourceLink));
    }
  });

  return assets;
}

function createAsset(
  asset: Omit<DownloadAsset, 'id' | 'canonicalUrl' | 'qualityScore'> & { qualityLabel?: string; url: string }
) {
  return {
    ...asset,
    id: createId(),
    canonicalUrl: canonicalizeUrl(asset.url),
    qualityScore: scoreQuality({
      width: asset.width,
      height: asset.height,
      bitrate: asset.bitrate,
      qualityLabel: asset.qualityLabel,
      url: asset.url,
    }),
  };
}

function extractStructuredAssets(item: RawDatasetItem) {
  const result = item.result;
  if (!result) {
    return [] as DownloadAsset[];
  }

  const sourceLink = item.url ?? result.url;
  const durationSeconds = safeParseNumber(result.duration);
  const assets: DownloadAsset[] = [];

  if (Array.isArray(result.images)) {
    result.images.forEach(image => {
      const url = asUrl(typeof image === 'string' ? image : image?.url);
      if (!url) {
        return;
      }

      assets.push(
        createAsset({
          kind: 'image',
          url,
          width: typeof image === 'string' ? undefined : safeParseNumber(image.width),
          height: typeof image === 'string' ? undefined : safeParseNumber(image.height),
          bitrate: undefined,
          durationSeconds,
          qualityLabel: 'image',
          mimeType: undefined,
          sourceLink,
        })
      );
    });
  }

  if (Array.isArray(result.medias)) {
    result.medias.forEach(media => {
      const url = asUrl(media.url);
      if (!url) {
        return;
      }

      const kind = media.type === 'image' ? 'image' : media.type === 'video' ? 'video' : inferKindFromUrl(url);
      if (!kind) {
        return;
      }

      assets.push(
        createAsset({
          kind,
          url,
          width: safeParseNumber(media.width),
          height: safeParseNumber(media.height),
          bitrate: safeParseNumber(media.bitrate),
          durationSeconds,
          qualityLabel: media.quality,
          mimeType: media.extension ? `${kind}/${media.extension}` : undefined,
          sourceLink,
        })
      );
    });
  }

  return assets;
}

function extractRecordAssets(item: unknown) {
  const datasetItem = item as RawDatasetItem;
  const structured = extractStructuredAssets(datasetItem);
  if (structured.length > 0) {
    return structured;
  }

  return extractAssets(item, [], datasetItem.url ?? datasetItem.result?.url);
}

function getStructuredErrorMessage(datasetItems: unknown[]) {
  const messages = datasetItems
    .map(item => (item as RawDatasetItem).result)
    .filter((result): result is RawResult => Boolean(result))
    .map(result => {
      if (typeof result.message === 'string' && result.message.trim()) {
        return result.status != null ? `${result.message.trim()} (status ${String(result.status)})` : result.message.trim();
      }

      if (result.error === true) {
        return `Failed to process ${result.url ?? 'item'}`;
      }

      if (typeof result.error === 'string' && result.error.trim()) {
        return result.error.trim();
      }

      return undefined;
    })
    .filter((value): value is string => Boolean(value));

  return messages[0];
}

function dedupeAssets(assets: DownloadAsset[]) {
  const selected = new Map<string, DownloadAsset>();

  assets.forEach(asset => {
    const existing = selected.get(asset.canonicalUrl);
    if (!existing || asset.qualityScore > existing.qualityScore) {
      selected.set(asset.canonicalUrl, asset);
    }
  });

  return Array.from(selected.values()).sort((left, right) => {
    if (left.kind === right.kind) {
      return right.qualityScore - left.qualityScore;
    }

    return left.kind.localeCompare(right.kind);
  });
}

function isCountableAsset(asset: DownloadAsset) {
  return asset.qualityLabel?.toLowerCase() !== 'thumbnail';
}

function sortRecords(records: DownloadRecord[]) {
  return [...records].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function persist(records: DownloadRecord[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function getDownloadRecords() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [] as DownloadRecord[];
  }

  try {
    return sortRecords(JSON.parse(raw) as DownloadRecord[]);
  } catch {
    return [] as DownloadRecord[];
  }
}

export async function createDownloadRecord(token: string, links: string[]) {
  // Group links by platform
  const grouped = groupLinksByPlatform(links);
  const platforms: Platform[] = [];
  const platformRuns: Record<Platform, { runId: string; datasetId?: string }> = {
    douyin: { runId: '', datasetId: undefined },
    xiaohongshu: { runId: '', datasetId: undefined },
  };

  // Collect all submission promises
  const submissionPromises: Promise<{ platform: Platform; run: any }>[] = [];

  if (grouped.douyin.length > 0) {
    platforms.push('douyin');
    submissionPromises.push(
      submitDownloadJob(token, grouped.douyin, 'douyin').then(run => ({
        platform: 'douyin',
        run,
      }))
    );
  }

  if (grouped.xiaohongshu.length > 0) {
    platforms.push('xiaohongshu');
    submissionPromises.push(
      submitDownloadJob(token, grouped.xiaohongshu, 'xiaohongshu').then(run => ({
        platform: 'xiaohongshu',
        run,
      }))
    );
  }

  if (submissionPromises.length === 0) {
    throw new Error('No valid links to submit.');
  }

  // Submit all platforms concurrently
  const results = await Promise.all(submissionPromises);

  // Store run info for each platform
  for (const result of results) {
    platformRuns[result.platform] = {
      runId: result.run.id,
      datasetId: result.run.defaultDatasetId,
    };
  }

  // For backward compatibility, use the first run's info in the main fields
  const firstRun = results[0];

  const now = new Date().toISOString();
  const record: DownloadRecord = {
    id: createId(),
    submittedLinks: links,
    status: mapApifyStatus(firstRun.run.status),
    apifyRunId: firstRun.run.id,
    apifyDatasetId: firstRun.run.defaultDatasetId,
    apifyStatus: firstRun.run.status,
    platforms,
    platformRuns,
    createdAt: now,
    startedAt: firstRun.run.startedAt ?? now,
    finishedAt: firstRun.run.finishedAt,
    updatedAt: now,
    hasImages: false,
    hasVideos: false,
    assets: [],
  };

  const records = [record, ...(await getDownloadRecords())];
  await persist(records);
  return sortRecords(records);
}

function mergeCompletedRecord(record: DownloadRecord, datasetItems: unknown[]) {
  const extracted = datasetItems.flatMap(item => extractRecordAssets(item));
  const assets = dedupeAssets(
    extracted.map(asset => ({
      ...asset,
      sourceRecordId: record.id,
    }))
  ).filter(isCountableAsset);
  const structuredErrorMessage = getStructuredErrorMessage(datasetItems);
  const hasErrorPayload = Boolean(structuredErrorMessage);
  const isFailedWithoutAssets = hasErrorPayload && assets.length === 0;
  const nextStatus = isFailedWithoutAssets ? ('failed' as const) : ('succeeded' as const);
  const finishedAt = record.finishedAt ?? new Date().toISOString();

  return {
    ...record,
    status: nextStatus,
    hasImages: assets.some(asset => asset.kind === 'image'),
    hasVideos: assets.some(asset => asset.kind === 'video'),
    assets,
    authorNicknames: [...new Set(
      datasetItems
        .map(item => (item as RawDatasetItem).result?.author)
        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        .map(a => a.trim())
    )],
    updatedAt: new Date().toISOString(),
    finishedAt,
    errorMessage: structuredErrorMessage,
  };
}

async function refreshRecord(record: DownloadRecord, token: string) {
  // For backward compatibility, check if this is a single-platform record
  if (!record.platformRuns || (record.apifyRunId && !record.platforms)) {
    // Old-style single run record
    if (!record.apifyRunId || !ACTIVE_STATUSES.includes(record.status)) {
      return record;
    }

    const run = await getRun(token, record.apifyRunId);
    const nextStatus = mapApifyStatus(run.status);
    const baseRecord: DownloadRecord = {
      ...record,
      status: nextStatus,
      apifyStatus: run.status,
      apifyDatasetId: run.defaultDatasetId ?? record.apifyDatasetId,
      startedAt: run.startedAt ?? record.startedAt,
      finishedAt: run.finishedAt ?? record.finishedAt,
      updatedAt: new Date().toISOString(),
      errorMessage: nextStatus === 'failed' ? record.errorMessage ?? 'Apify run failed.' : undefined,
    };

    if (nextStatus === 'succeeded' && baseRecord.apifyDatasetId) {
      const datasetItems = await getDatasetItems(token, baseRecord.apifyDatasetId);
      return mergeCompletedRecord(baseRecord, datasetItems);
    }

    return baseRecord;
  }

  // New-style multi-platform record
  if (!ACTIVE_STATUSES.includes(record.status) || !record.platformRuns) {
    return record;
  }

  // Poll status for all platforms concurrently
  const statusPromises = (record.platforms || []).map(async platform => {
    const platformRun = record.platformRuns?.[platform];
    if (!platformRun?.runId) {
      return { platform, status: 'unknown', run: null };
    }

    try {
      const run = await getRun(token, platformRun.runId);
      return { platform, status: mapApifyStatus(run.status), run };
    } catch {
      return { platform, status: 'failed' as const, run: null };
    }
  });

  const statusResults = await Promise.all(statusPromises);

  // Determine overall status: succeeded only if all platforms succeeded
  const allSucceeded = statusResults.every(r => r.status === 'succeeded');
  const anyFailed = statusResults.some(r => r.status === 'failed');
  const nextStatus: DownloadStatus = allSucceeded ? 'succeeded' : anyFailed ? 'failed' : 'running';

  const baseRecord: DownloadRecord = {
    ...record,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
    errorMessage: nextStatus === 'failed' && !record.errorMessage ? 'One or more Apify runs failed.' : record.errorMessage,
  };

  // If succeeded, fetch results from all platforms concurrently
  if (nextStatus === 'succeeded') {
    const datasetPromises = (record.platforms || [])
      .map(platform => {
        const platformRun = record.platformRuns?.[platform];
        if (!platformRun?.datasetId) {
          return Promise.resolve({ platform, items: [] as any[] });
        }
        return getDatasetItems(token, platformRun.datasetId).then(items => ({
          platform,
          items,
        }));
      });

    const datasetResults = await Promise.all(datasetPromises);

    // Merge results from all platforms
    const allDatasetItems = datasetResults.flatMap(r => r.items);
    return mergeCompletedRecord(baseRecord, allDatasetItems);
  }

  return baseRecord;
}

export async function refreshPendingRecords(records: DownloadRecord[], token: string) {
  const refreshed = await Promise.all(records.map(record => refreshRecord(record, token)));
  await persist(refreshed);
  return sortRecords(refreshed);
}

function detectPlatform(url: string): Platform {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('douyin.com')) {
      return 'douyin';
    }
    
    if (hostname.includes('xiaohongshu.com')) {
      return 'xiaohongshu';
    }
    
    // Default to xiaohongshu for backward compatibility
    return 'xiaohongshu';
  } catch {
    // Default to xiaohongshu if URL parsing fails
    return 'xiaohongshu';
  }
}

function groupLinksByPlatform(links: string[]): GroupedLinks {
  return links.reduce(
    (acc, link) => {
      const platform = detectPlatform(link);
      acc[platform].push(link);
      return acc;
    },
    { douyin: [] as string[], xiaohongshu: [] as string[] }
  );
}

export function parseLinks(rawInput: string) {
  const links = rawInput
    .split(/\s+/)
    .map(value => value.trim())
    .filter(Boolean)
    .filter(value => /^https?:\/\//i.test(value));

  return Array.from(new Set(links));
}

export function getActiveRecordCount(records: DownloadRecord[]) {
  return records.filter(record => ACTIVE_STATUSES.includes(record.status)).length;
}

export function buildExportResult(records: DownloadRecord[]): ExportResult {
  const dedupedAssets = dedupeAssets(records.flatMap(record => record.assets)).filter(isCountableAsset);
  const text = dedupedAssets.map(asset => asset.url).join('\n');

  return {
    text,
    count: dedupedAssets.length,
  };
}

export function getStatusLabel(status: DownloadStatus) {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Running';
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'aborted':
      return 'Aborted';
    default:
      return 'Unknown';
  }
}