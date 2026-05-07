'use client';

import { useState, useEffect } from 'react';

export function useLocalStorage(key: string, initialValue: string) {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(item);
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
  }, [key]);

  const setValue = (value: string) => {
    try {
      setStoredValue(value);
      if (isMounted) {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}
