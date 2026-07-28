// 极简 frontmatter 解析/序列化（不引入 YAML 依赖）。
// 约定：文件开头第一行 `---` 到下一行 `---` 之间为 frontmatter；
// 第二个 `---` 之后的全部内容为正文（正文里再出现的 `---` 不影响切分）。
// frontmatter 每行 `key: value`，值一律以原始字符串保存，由调用方做类型转换。

export interface Parsed {
  frontmatter: Record<string, string>;
  body: string;
}

/** 解析 frontmatter + 正文。无合法 frontmatter 时 frontmatter 为空、正文为全文。 */
export function parse(text: string): Parsed {
  const lines = text.split('\n');
  // 去掉每行结尾可能的 \r（跨平台）
  const at = (i: number) => (lines[i] ?? '').replace(/\r$/, '');

  if (at(0).trim() !== '---') {
    return { frontmatter: {}, body: text };
  }

  // 找第二个分隔符
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (at(i).trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    // 没有闭合分隔符，整体当正文
    return { frontmatter: {}, body: text };
  }

  const frontmatter: Record<string, string> = {};
  for (let i = 1; i < end; i++) {
    const line = at(i);
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) frontmatter[key] = value;
  }

  const body = lines
    .slice(end + 1)
    .map((l) => l.replace(/\r$/, ''))
    .join('\n');

  return { frontmatter, body };
}

/** 把 frontmatter 字段（原始字符串值）+ 正文序列化为文件文本。 */
export function serialize(fields: Record<string, string>, body: string): string {
  const head = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  return ['---', ...head, '---', body].join('\n');
}
