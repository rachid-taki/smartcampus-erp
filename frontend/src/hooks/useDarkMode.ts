import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'smartcampus-theme';

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode(): [boolean, () => void] {
  const [isDark, setIsDark] = useState<boolean>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      window.localStorage.setItem(STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem(STORAGE_KEY, 'light');
    }
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);

  return [isDark, toggle];
}
