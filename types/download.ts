export type DownloadStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted';

export type AssetKind = 'image' | 'video';

export type DownloadAsset = {
  id: string;
  kind: AssetKind;
  url: string;
  canonicalUrl: string;
  qualityScore: number;
  width?: number;
  height?: number;
  bitrate?: number;
  durationSeconds?: number;
  qualityLabel?: string;
  mimeType?: string;
  sourceRecordId?: string;
  sourceLink?: string;
};

export type DownloadRecord = {
  id: string;
  submittedLinks: string[];
  status: DownloadStatus;
  apifyRunId?: string;
  apifyDatasetId?: string;
  apifyStatus?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
  hasImages: boolean;
  hasVideos: boolean;
  assets: DownloadAsset[];
  errorMessage?: string;
};

export type CreateRunResponse = {
  data?: {
    id: string;
    startedAt?: string;
    finishedAt?: string;
    status?: string;
    defaultDatasetId?: string;
  };
};

export type ApifyRun = {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  defaultDatasetId?: string;
};

export type ExportResult = {
  text: string;
  count: number;
};