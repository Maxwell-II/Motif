import type React from 'react';

// 输入法组字中的按键(含"回车上屏"那一下)不应触发提交/保存。
// macOS WKWebView 在输入法回车确认的 keydown 中 isComposing 为 false、keyCode 为 229,
// 只查 isComposing 挡不住,故两者都查。
export function isImeComposing(e: React.KeyboardEvent): boolean {
  return e.nativeEvent.isComposing || e.keyCode === 229;
}
