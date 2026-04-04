import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

export function useSecureString(key: string, defaultValue = '') {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const stored = await SecureStore.getItemAsync(key);
        if (isMounted) {
          setValue(stored ?? defaultValue);
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
  }, [defaultValue, key]);

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
    saveValue,
    clearValue,
  };
}