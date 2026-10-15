import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { Item } from '../types';
import * as repo from '../db/repo';

/** 白名单 slug：只保留汉字/字母/数字，其余折叠为单个 - */
function slugify(text: string, maxLen = 24): string {
  const firstLine = text.split('\n')[0].replace(/^#+\s*/, ''); // 取第一行并去 markdown 标题前缀
  const s = firstLine
    .replace(/[^\p{Script=Han}\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, maxLen)
    .replace(/-$/g, ''); // 截断后可能留尾部 -
  return s || 'untitled';
}

function buildFrontmatter(item: Item, tags: string[]): string {
  return [
    '---',
    `id: "${item.id}"`,
    `created: "${item.created_at}"`,
    `updated: "${item.updated_at}"`,
    `status: ${item.status}`,
    `priority: ${item.priority ?? 'null'}`,
    `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
    '---',
    '',
    '',
  ].join('\n');
}

export async function exportAllToMarkdown(): Promise<number> {
  const dir = await open({ directory: true, multiple: false, title: '选择导出目录' });
  if (!dir || Array.isArray(dir)) return 0;

  const [items, rawItemTags] = await Promise.all([
    repo.listItems(),
    repo.listItemTagMap(),
  ]);

  const itemTagNames: Record<string, string[]> = {};
  for (const row of rawItemTags) {
    if (!itemTagNames[row.item_id]) itemTagNames[row.item_id] = [];
    itemTagNames[row.item_id].push(row.name);
  }

  const usedNames = new Set<string>();
  const files: Array<{ name: string; content: string }> = [];

  for (const item of items) {
    const date = item.created_at.slice(0, 10);
    const slug = slugify(item.content);
    let filename = `${date}-${slug}.md`;

    if (usedNames.has(filename)) {
      let i = 2;
      while (usedNames.has(`${date}-${slug}-${i}.md`)) i++;
      filename = `${date}-${slug}-${i}.md`;
    }
    usedNames.add(filename);

    const tags = itemTagNames[item.id] ?? [];
    files.push({ name: filename, content: buildFrontmatter(item, tags) + item.content });
  }

  return invoke<number>('write_md_files', { dir, files });
}
