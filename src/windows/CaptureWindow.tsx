import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { createItem } from '../db/repo';
import { parseCapture } from '../lib/parseCapture';
import { applyTheme, useSettingsStore, type Theme } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import { isImeComposing } from '../lib/ime';

const WIN_W = 560;
const PADDING_V = 24;
const MIN_WIN_H = 48;
const MAX_TEXTAREA_H = 280;

export default function CaptureWindow() {
  const [text, setText] = useState('');
  const [flash, setFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const win = getCurrentWindow();
  const lang = useSettingsStore((s) => s.lang);
  const s = STRINGS[lang];

  const resetSize = useCallback(async () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await win.setSize(new LogicalSize(WIN_W, MIN_WIN_H));
  }, [win]);

  const adjustSize = useCallback(async () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const clamped = Math.min(el.scrollHeight, MAX_TEXTAREA_H);
    el.style.height = clamped + 'px';
    await win.setSize(new LogicalSize(WIN_W, Math.max(MIN_WIN_H, clamped + PADDING_V)));
  }, [win]);

  useEffect(() => {
    const handleFocus = () => {
      // Re-apply theme in case main window changed it
      const savedTheme = (localStorage.getItem('motif-theme') as Theme | null) ?? 'system';
      applyTheme(savedTheme);

      // 失焦隐藏时保留草稿:有草稿则按内容恢复高度,光标置于末尾;无草稿则收回单行
      const hasDraft = !!textareaRef.current?.value;
      if (hasDraft) adjustSize();
      else resetSize();
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
      }, 50);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [resetSize, adjustSize]);

  // 只有保存成功或 Esc 才清空草稿后隐藏(失焦隐藏由 Rust 端处理,不经过这里)
  const doHide = useCallback(async () => {
    setText('');
    await resetSize();
    await invoke('hide_capture');
  }, [resetSize]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 输入法组字中(含回车上屏)的按键一律交给输入法
    if (isImeComposing(e)) return;

    if (e.key === 'Escape') {
      await doHide();
      return;
    }

    // Enter / Shift+Enter 走 textarea 默认换行;Cmd/Ctrl+Enter 保存
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const raw = text.trim();
      if (!raw) {
        await doHide();
        return;
      }

      const { content } = parseCapture(raw);
      try {
        await createItem(content);
        await emit('item-created', null);
      } catch (err) {
        console.error('保存失败', err);
        return;
      }

      setFlash(true);
      setTimeout(async () => {
        setFlash(false);
        await doHide();
      }, 100);
    }
  };

  return (
    <div
      className={`w-full h-full flex items-start px-3 py-3 border transition-colors duration-75 ${
        flash
          ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          adjustSize();
        }}
        onKeyDown={handleKeyDown}
        placeholder={s.capture_placeholder}
        rows={1}
        className="w-full resize-none border-0 outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed"
        style={{ minHeight: '24px', overflowY: 'auto' }}
      />
    </div>
  );
}
