import type { Kind } from '../types';

// 捕获语法(spec 第 9 节扩展点)。V1 只认 `w ` 前缀:
// 开头 w/W 紧跟半角或全角空格 → 单词,去掉前缀;其余原样为普通条目。
// `what`、`w/o`、单独的 `w` 都不算。返回的 content 已去首尾空白,为空表示无需保存。
export function parseCapture(raw: string): { content: string; kind: Kind } {
  const text = raw.trim();
  const m = /^[wW][ \u3000]+/.exec(raw.trimStart());
  if (m) return { content: raw.trimStart().slice(m[0].length).trim(), kind: 'word' };
  return { content: text, kind: 'note' };
}
