import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import { getApifyBalance, type ApifyBalanceInfo } from '@/services/apify-service';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong.';
}

export function useApifyBalance(token: string) {
  const isFocused = useIsFocused();
  const [balance, setBalance] = useState<ApifyBalanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const refreshBalance = useCallback(async () => {
    if (!token.trim()) {
      setBalance(null);
      setErrorMessage(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const next = await getApifyBalance(token);
      setBalance(next);
      setErrorMessage(undefined);
    } catch (error) {
      setBalance(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void refreshBalance();
  }, [isFocused, refreshBalance]);

  return {
    balance,
    loading,
    errorMessage,
    refreshBalance,
  };
}
