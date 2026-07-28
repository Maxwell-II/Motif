import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { STRINGS, type Lang } from '../lib/strings';

export type Theme = 'light' | 'dark' | 'system';
export type { Lang };

export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

interface SettingsState {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  syncTrayLang: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const savedTheme = (localStorage.getItem('motif-theme') as Theme | null) ?? 'system';
  const savedLang = (localStorage.getItem('motif-lang') as Lang | null) ?? 'zh';

  // Re-apply on system theme change
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const t = (localStorage.getItem('motif-theme') as Theme | null) ?? 'system';
    if (t === 'system') applyTheme('system');
  });

  applyTheme(savedTheme);

  const buildTrayLabels = (lang: Lang) => {
    const s = STRINGS[lang];
    return [
      ['open_main', s.tray_open_main],
      ['quick_capture', s.tray_quick_capture],
      ['quit', s.tray_quit],
      ['shortcut_err', s.tray_shortcut_err],
    ] as [string, string][];
  };

  return {
    theme: savedTheme,
    lang: savedLang,

    setTheme: (theme) => {
      localStorage.setItem('motif-theme', theme);
      applyTheme(theme);
      set({ theme });
    },

    setLang: (lang) => {
      localStorage.setItem('motif-lang', lang);
      invoke('set_tray_language', { labels: buildTrayLabels(lang) }).catch(() => {});
      set({ lang });
    },

    syncTrayLang: () => {
      const { lang } = get();
      invoke('set_tray_language', { labels: buildTrayLabels(lang) }).catch(() => {});
    },
  };
});
