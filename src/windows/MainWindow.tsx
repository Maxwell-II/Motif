import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useItemsStore } from '../stores/itemsStore';
import { useSettingsStore, type Theme, type Lang } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import { isImeComposing } from '../lib/ime';
import type { TagWithCount } from '../types';
import Overview from '../pages/Overview';
import Inbox from '../pages/Inbox';
import AllItems from '../pages/AllItems';
import { exportAllToMarkdown } from '../lib/exportMarkdown';

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function MainWindow() {
  const {
    currentPage, setPage, inboxCount, load, addItem, reloadFromDisk,
    tags, tagFilter, setTagFilter, deleteTag,
    triggerFocusSearch,
  } = useItemsStore();
  const { theme, lang, setTheme, setLang, syncTrayLang } = useSettingsStore();
  const s = STRINGS[lang];

  const [quickInput, setQuickInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [dataDir, setDataDir] = useState('');
  const [dataDirMsg, setDataDirMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
    syncTrayLang();
    invoke<string>('get_data_dir').then(setDataDir).catch(() => {});
  }, []);

  // 捕获窗写文件后广播 item-created；本窗口 repo 缓存独立，需重读磁盘
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen('item-created', () => {
      reloadFromDisk();
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [reloadFromDisk]);

  // 回到主窗口（获得焦点）时重读数据目录，拾取其他设备/同步工具搬来的改动
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) reloadFromDisk();
      })
      .then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [reloadFromDisk]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (((e.ctrlKey || e.metaKey) && e.key === 'f') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        setPage('all');
        triggerFocusSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPage, triggerFocusSearch]);

  // 点击设置面板外部关闭
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isSettingsOpen]);

  // Esc 关闭设置面板
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSettingsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isSettingsOpen]);

  const doQuickAdd = async () => {
    const text = quickInput.trim();
    if (!text) return;
    await addItem(text);
    setQuickInput('');
    inputRef.current?.focus();
  };

  const handleDeleteTag = async (tag: TagWithCount) => {
    if (tag.count > 0) {
      const ok = window.confirm(s.tag_delete_confirm(tag.count));
      if (!ok) return;
    }
    if (tagFilter === tag.id) setTagFilter(null);
    await deleteTag(tag.id);
  };

  const handleChangeDataDir = async () => {
    const picked = await open({ directory: true, multiple: false, title: s.sidebar_datadir_label });
    if (!picked || Array.isArray(picked)) return;
    await invoke('set_data_dir', { path: picked });
    setDataDir(picked);
    await reloadFromDisk();
    setDataDirMsg(s.sidebar_datadir_changed);
    setTimeout(() => setDataDirMsg(null), 3000);
  };

  const handleExport = async () => {
    try {
      const count = await exportAllToMarkdown();
      if (count > 0) {
        setExportMsg(s.sidebar_export_success(count));
        setTimeout(() => setExportMsg(null), 3000);
      }
    } catch {
      setExportMsg(s.sidebar_export_fail);
      setTimeout(() => setExportMsg(null), 3000);
    }
  };

  const navItems = [
    { key: 'overview' as const, label: s.nav_overview },
    { key: 'inbox' as const, label: `${s.nav_inbox}${inboxCount > 0 ? ` (${inboxCount})` : ''}` },
    { key: 'all' as const, label: s.nav_all },
  ];

  const THEMES: { value: Theme; label: string }[] = [
    { value: 'light', label: s.sidebar_theme_light },
    { value: 'dark', label: s.sidebar_theme_dark },
    { value: 'system', label: s.sidebar_theme_system },
  ];

  const LANGS: { value: Lang; label: string }[] = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'EN' },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* 左侧边栏 */}
      <aside className="w-44 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col py-4">
        <div className="px-4 mb-6">
          <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">Motif</span>
        </div>

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'all') setTagFilter(null);
                setPage(key);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentPage === key && (key !== 'all' || tagFilter === null)
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}

          {tags.length > 0 && (
            <div className="pt-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-1">
                {s.sidebar_tags}
              </p>
              {tags.map((tag) => (
                <div key={tag.id} className="group relative">
                  <button
                    onClick={() => { setTagFilter(tag.id); setPage('all'); }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                      tagFilter === tag.id
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="flex-1 truncate">#{tag.name}</span>
                    <span className="text-xs text-gray-300 dark:text-gray-600 ml-1 flex-shrink-0 opacity-100 group-hover:opacity-0 transition-opacity">
                      {tag.count}
                    </span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                    title={s.tag_delete_title}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* 底部：设置按钮 + 弹出面板 */}
        <div className="px-2 pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
          <div className="relative" ref={settingsRef}>
            {/* 设置弹出面板（向上弹出） */}
            {isSettingsOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 py-3 z-30">
                {/* 主题 */}
                <div className="px-3 mb-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">{s.sidebar_theme_label}</p>
                  <div className="flex gap-0.5">
                    {THEMES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`flex-1 text-xs py-1 rounded transition-colors ${
                          theme === value
                            ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 语言 */}
                <div className="px-3 mb-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">{s.sidebar_lang_label}</p>
                  <div className="flex gap-0.5">
                    {LANGS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setLang(value)}
                        className={`flex-1 text-xs py-1 rounded transition-colors ${
                          lang === value
                            ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 数据目录 */}
                <div className="px-3 mb-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">{s.sidebar_datadir_label}</p>
                  <p
                    className="text-xs text-gray-600 dark:text-gray-300 break-all leading-snug mb-1"
                    title={dataDir}
                  >
                    {dataDir || '…'}
                  </p>
                  {dataDirMsg && (
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">{dataDirMsg}</p>
                  )}
                  <button
                    onClick={handleChangeDataDir}
                    className="text-xs py-1 px-2 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {s.sidebar_datadir_change}
                  </button>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-gray-100 dark:border-gray-700 my-2" />

                {/* 导出 */}
                <div className="px-3">
                  {exportMsg && (
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1 text-center">{exportMsg}</p>
                  )}
                  <button
                    onClick={handleExport}
                    className="w-full text-left text-xs py-1.5 px-2 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {s.sidebar_export}
                  </button>
                </div>
              </div>
            )}

            {/* 设置触发按钮 */}
            <button
              onClick={() => setIsSettingsOpen((v) => !v)}
              title={s.settings_label}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                isSettingsOpen
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <GearIcon />
              <span>{s.settings_label}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <form
          onSubmit={(e) => { e.preventDefault(); doQuickAdd(); }}
          className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex gap-2"
        >
          <input
            ref={inputRef}
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!isImeComposing(e)) doQuickAdd();
              }
            }}
            placeholder={s.quickadd_placeholder}
            className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="text-sm px-3 py-1.5 rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-30 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            {s.quickadd_button}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto">
          {currentPage === 'overview' && <Overview />}
          {currentPage === 'inbox' && <Inbox />}
          {currentPage === 'all' && <AllItems />}
        </div>
      </main>
    </div>
  );
}
