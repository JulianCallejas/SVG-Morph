import { useCallback, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';

const readTheme = (): Theme => (document.documentElement.classList.contains('light') ? 'light' : 'dark');

// Dark is the default. The inline script in index.html applies the stored choice before the first paint;
// this hook keeps the `light` and legacy `dark` classes on <html> in sync with the user's toggle.
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggleTheme = useCallback(() => {
    const next: Theme = readTheme() === 'light' ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.toggle('light', next === 'light');
    root.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts for this visit only.
    }
    setTheme(next);
  }, []);

  return { theme, toggleTheme };
};
