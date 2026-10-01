import { useCallback, useEffect, useState } from 'react';

const KEY = 'mm-theme';

const systemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const readSaved = () => {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null; // storage blocked (private mode): fall back to the OS theme
  }
};

/** Light/dark theme stored per browser. Sets <html data-theme="..."> used by tokens.css. */
export const useTheme = () => {
  const [theme, setTheme] = useState(() => readSaved() || systemTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // storage blocked: the choice lasts for this visit only
      }
      return next;
    });
  }, []);

  return { theme, toggle };
};
