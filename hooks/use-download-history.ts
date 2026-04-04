import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';

import {
    buildExportResult,
    createDownloadRecord,
    getActiveRecordCount,
    getDownloadRecords,
    parseLinks,
    refreshPendingRecords,
} from '@/services/download-history-service';
import type { DownloadRecord } from '@/types/download';

type SubmitResult = {
  linkCount: number;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong.';
}

export function useDownloadHistory(token: string) {
  const isFocused = useIsFocused();
  const refreshLockRef = useRef(false);
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadRecords = async () => {
    const stored = await getDownloadRecords();
    setRecords(stored);
    return stored;
  };

  const refreshPending = async (silent = false) => {
    if (refreshLockRef.current) {
      return records;
    }

    refreshLockRef.current = true;
    if (!silent) {
      setRefreshing(true);
    }

    try {
      const current = await getDownloadRecords();
      if (!token.trim()) {
        setRecords(current);
        return current;
      }

      const next = await refreshPendingRecords(current, token);
      setRecords(next);
      setErrorMessage(undefined);
      return next;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return records;
    } finally {
      refreshLockRef.current = false;
      if (!silent) {
        setRefreshing(false);
      }
    }
  };

  const submitLinks = async (rawInput: string): Promise<SubmitResult> => {
    if (!token.trim()) {
      throw new Error('Missing Apify token. Configure it in Settings first.');
    }

    const links = parseLinks(rawInput);
    if (links.length === 0) {
      throw new Error('Paste at least one valid Xiaohongshu URL.');
    }

    setSubmitting(true);
    try {
      const next = await createDownloadRecord(token, links);
      setRecords(next);
      setErrorMessage(undefined);
      return { linkCount: links.length };
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const stored = await getDownloadRecords();
        if (isMounted) {
          setRecords(stored);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void loadRecords();
    void refreshPending();
  }, [isFocused, token]);

  useEffect(() => {
    if (!isFocused || !token.trim() || getActiveRecordCount(records) === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshPending(true);
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isFocused, records, token]);

  const isPolling = isFocused && token.trim().length > 0 && getActiveRecordCount(records) > 0;

  return {
    records,
    loading,
    refreshing,
    submitting,
    errorMessage,
    activeRecordCount: getActiveRecordCount(records),
    refreshPending,
    submitLinks,
    exportResult: buildExportResult(records),
    isPolling,
  };
}