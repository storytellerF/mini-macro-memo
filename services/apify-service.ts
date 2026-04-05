import type { ApifyRun, CreateRunResponse, DownloadStatus, Platform } from '@/types/download';

const APIFY_BASE_URL = 'https://api.apify.com/v2';
const ACTOR_PATHS: Record<Platform, string> = {
  xiaohongshu: 'easyapi~rednote-xiaohongshu-video-downloader',
  douyin: 'easyapi~douyin-video-downloader',
};

type RequestOptions = {
  method?: 'GET' | 'POST';
  token: string;
  body?: unknown;
};

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
  status?: unknown;
};

export type ApifyBalanceInfo = {
  amount: number;
  currency: 'USD';
  source: string;
};

function buildUrl(pathname: string, token: string, params?: Record<string, string>) {
  const url = new URL(`${APIFY_BASE_URL}${pathname}`);
  url.searchParams.set('token', token);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

async function requestJson<T>(pathname: string, options: RequestOptions, params?: Record<string, string>) {
  const response = await fetch(buildUrl(pathname, options.token, params), {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text();
    const fallbackMessage = `Apify request failed with status ${response.status}`;

    if (!text.trim()) {
      throw new Error(fallbackMessage);
    }

    let payload: ApiErrorPayload | undefined;
    try {
      payload = JSON.parse(text) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }

    if (payload) {
      const messageFromPayload = typeof payload.message === 'string'
        ? payload.message
        : typeof payload.error === 'string'
          ? payload.error
          : undefined;
      const statusFromPayload = typeof payload.status === 'number' ? payload.status : response.status;

      if (messageFromPayload && messageFromPayload.trim()) {
        throw new Error(`Apify request failed (${statusFromPayload}): ${messageFromPayload.trim()}`);
      }
    }

    throw new Error(text || fallbackMessage);
  }

  return (await response.json()) as T;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getNumberValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }

    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

export function mapApifyStatus(status: string | undefined): DownloadStatus {
  switch (status) {
    case 'RUNNING':
    case 'READY':
      return 'running';
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
    case 'TIMED-OUT':
      return 'failed';
    case 'ABORTED':
      return 'aborted';
    default:
      return 'queued';
  }
}

export async function createDownloadRun(token: string, links: string[]) {
  if (!token.trim()) {
    throw new Error('Missing Apify token. Configure it in Settings before downloading.');
  }

  // Default to xiaohongshu for backward compatibility
  return submitDownloadJob(token, links, 'xiaohongshu');
}

export async function submitDownloadJob(token: string, links: string[], platform: Platform) {
  if (!token.trim()) {
    throw new Error('Missing Apify token. Configure it in Settings before downloading.');
  }

  if (links.length === 0) {
    throw new Error('No links to submit.');
  }

  const actorPath = ACTOR_PATHS[platform];
  const payload = {
    links,
    proxyConfiguration: {
      useApifyProxy: false,
      apifyProxyGroups: ['RESIDENTIAL'],
    },
  };

  const response = await requestJson<CreateRunResponse>(
    `/acts/${actorPath}/runs`,
    {
      method: 'POST',
      token,
      body: payload,
    }
  );

  const run = response.data;
  if (!run?.id) {
    throw new Error('Apify did not return a run id.');
  }

  return {
    id: run.id,
    status: run.status ?? 'READY',
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    defaultDatasetId: run.defaultDatasetId,
  } as ApifyRun;
}

export async function getRun(token: string, runId: string) {
  const response = await requestJson<{ data?: ApifyRun }>(`/actor-runs/${runId}`, {
    token,
  });

  if (!response.data?.id) {
    throw new Error('Unable to read Apify run status.');
  }

  return response.data;
}

export async function getDatasetItems(token: string, datasetId: string) {
  return requestJson<unknown[]>(
    `/datasets/${datasetId}/items`,
    {
      token,
    },
    {
      clean: 'true',
      format: 'json',
    }
  );
}

export async function getApifyBalance(token: string): Promise<ApifyBalanceInfo> {
  if (!token.trim()) {
    throw new Error('Missing Apify token. Configure it in Settings first.');
  }

  const response = await requestJson<{ data?: unknown }>('/users/me', {
    token,
  });

  const user = asRecord(response.data);
  if (!user) {
    throw new Error('Unable to read Apify user data.');
  }

  const balanceAmount = getNumberValue(user, [
    'availableBalanceUsd',
    'availableBalance',
    'balanceUsd',
    'balance',
  ]);

  if (balanceAmount != null) {
    return {
      amount: balanceAmount,
      currency: 'USD',
      source: 'available balance',
    };
  }

  const limits = asRecord(user.limits);
  if (!limits) {
    throw new Error('Apify balance fields are not available for this account.');
  }

  const monthlyLimit = getNumberValue(limits, ['monthlyUsageLimitUsd']);
  const monthlyUsage = getNumberValue(limits, ['monthlyUsageUsd']);

  if (monthlyLimit == null || monthlyUsage == null) {
    throw new Error('Apify balance fields are not available for this account.');
  }

  return {
    amount: Math.max(monthlyLimit - monthlyUsage, 0),
    currency: 'USD',
    source: 'monthly limit minus usage',
  };
}