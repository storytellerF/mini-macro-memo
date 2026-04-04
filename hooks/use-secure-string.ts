import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

export function useSecureString(key: string, defaultValue = '') {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await SecureStore.getItemAsync(key);
      setValue(stored ?? defaultValue);
    } finally {
      setLoading(false);
    }
  }, [defaultValue, key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveValue = async (nextValue: string) => {
    await SecureStore.setItemAsync(key, nextValue);
    setValue(nextValue);
  };

  const clearValue = async () => {
    await SecureStore.deleteItemAsync(key);
    setValue(defaultValue);
  };

  return {
    value,
    loading,
    reload,
    saveValue,
    clearValue,
  };
}