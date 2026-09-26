// 全局捕获快捷键:键盘事件 → accelerator 字符串,以及 accelerator → 显示文案。
// accelerator 由 Rust 侧 tauri-plugin-global-shortcut(global-hotkey 0.8 的 parse_hotkey / parse_key)解析,
// 键名不区分大小写;下表只输出该解析器接受的名称。
import { isMac } from './strings';

export const DEFAULT_SHORTCUT = 'CmdOrCtrl+Shift+Space';

// e.code 与 global-hotkey 键名相同的键(parse_key 大小写不敏感,直接透传)
const PASS_THROUGH = new Set([
  'Space', 'Enter', 'Tab', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Backquote', 'Backslash', 'BracketLeft', 'BracketRight', 'Comma', 'Equal', 'Minus',
  'Period', 'Quote', 'Semicolon', 'Slash',
  'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4',
  'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
  'NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide',
  'NumpadDecimal', 'NumpadEnter', 'NumpadEqual',
  'PrintScreen', 'Pause',
]);

/** 用 e.code 解析主键(Mac 上 Option 会改变 e.key);不支持的键返回 null */
function codeToKey(code: string): string | null {
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1]; // KeyA → A
  m = /^Digit([0-9])$/.exec(code);
  if (m) return m[1]; // Digit1 → 1
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code; // F1–F24
  if (PASS_THROUGH.has(code)) return code;
  return null;
}

/**
 * 录制:返回 accelerator;组合不完整(只有修饰键、没有修饰键、主键不支持)时返回 null,继续等待。
 * 要求至少一个非 Shift 修饰键,避免 Shift+字母 之类全局劫持正常输入。
 */
export function keyEventToAccel(e: KeyboardEvent): string | null {
  const key = codeToKey(e.code);
  if (!key) return null;
  if (!(e.ctrlKey || e.altKey || e.metaKey)) return null;

  const mods: string[] = [];
  if (isMac) {
    if (e.metaKey) mods.push('Cmd');
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
  } else {
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
    if (e.metaKey) mods.push('Super');
  }
  return [...mods, key].join('+');
}

const KEY_LABELS: Record<string, string> = {
  Backquote: '`', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Comma: ',',
  Equal: '=', Minus: '-', Period: '.', Quote: "'", Semicolon: ';', Slash: '/',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
};

/** accelerator → 显示文案,如 CmdOrCtrl+Shift+Space → Ctrl+Shift+Space(mac 为 Cmd+Shift+Space) */
export function formatAccel(accel: string): string {
  return accel
    .split('+')
    .map((raw) => {
      const t = raw.trim();
      switch (t.toUpperCase()) {
        case 'COMMANDORCONTROL':
        case 'COMMANDORCTRL':
        case 'CMDORCTRL':
        case 'CMDORCONTROL':
          return isMac ? 'Cmd' : 'Ctrl';
        case 'COMMAND':
        case 'CMD':
        case 'SUPER':
          return isMac ? 'Cmd' : 'Win';
        case 'OPTION':
        case 'ALT':
          return isMac ? 'Option' : 'Alt';
        case 'CONTROL':
        case 'CTRL':
          return 'Ctrl';
        case 'SHIFT':
          return 'Shift';
        default:
          return KEY_LABELS[t] ?? t;
      }
    })
    .join('+');
}
