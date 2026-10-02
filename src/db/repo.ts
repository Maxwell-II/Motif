import { invoke } from '@tauri-apps/api/core';
import type { Item, Kind, Priority, Status, Tag, TagWithCount } from '../types';
import { parse, serialize } from '../lib/frontmatter';

// ── 文件即真相：启动读进内存 → 数组查询 → 原子写文件 ──────────────────────
//
// 所有读写收敛在本模块（红线第 3 条）。函数签名保持不变，只换内部实现。
// item↔tag 关联内嵌在 item 的 tags 字段（tag id 数组），不再有独立 item_tags。
// 单词（kind: word）与普通条目同在 items/，只有单词才写出 kind 字段；
// 普通视图一律按 kind !== 'word' 过滤，缺省（无字段）即普通条目。
//
// M5.7：items/ 按记录内容自动分子目录（见 placeOf）。字段是真相，目录只是推出来的；
// 放错目录的文件在加载时自动挪回，用户从不手动“移动”条目。

interface ItemRecord {
  id: string;
  content: string;
  kind: Kind;
  priority: Priority | null;
  status: Status;
  tags: string[]; // tag id 列表
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface TagRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

let dataDir = '';
const items = new Map<string, ItemRecord>();
const tags = new Map<string, TagRecord>();
// 每条记录文件当前所在的子目录（不写进文件），位置变化时用来清理旧文件
const itemPlace = new Map<string, string>();

const ITEM_PLACES = ['items', 'items/words', 'items/archive', 'items/trash'];

/** 位置规则：已删 → trash；单词 → words；做完/归档 → archive；其余（inbox/todo）→ 根目录 */
function placeOf(r: ItemRecord): string {
  if (r.deleted_at !== null) return 'items/trash';
  if (r.kind === 'word') return 'items/words';
  if (r.status === 'done' || r.status === 'archived') return 'items/archive';
  return 'items';
}

let initPromise: Promise<void> | null = null;
function ensureLoaded(): Promise<void> {
  if (!initPromise) initPromise = loadAll();
  return initPromise;
}

/** 重新从数据目录加载（焦点/启动/切换数据目录时调用） */
export async function reload(): Promise<void> {
  initPromise = loadAll();
  return initPromise;
}

// ── 序列化 / 反序列化 ────────────────────────────────────────────────────

function itemToFile(r: ItemRecord): string {
  return serialize(
    {
      id: r.id,
      ...(r.kind === 'word' ? { kind: 'word' } : {}),
      priority: r.priority === null ? 'null' : String(r.priority),
      status: r.status,
      tags: JSON.stringify(r.tags),
      created_at: r.created_at,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at === null ? 'null' : r.deleted_at,
    },
    r.content,
  );
}

function tagToFile(r: TagRecord): string {
  return serialize(
    {
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at === null ? 'null' : r.deleted_at,
    },
    '',
  );
}

function parseItem(text: string): ItemRecord | null {
  const { frontmatter: fm, body } = parse(text);
  const id = fm.id;
  if (!id) return null;
  const priority =
    fm.priority && fm.priority !== 'null' ? (Number(fm.priority) as Priority) : null;
  let tagIds: string[] = [];
  try {
    if (fm.tags) tagIds = JSON.parse(fm.tags);
  } catch {
    tagIds = [];
  }
  const created_at = fm.created_at || new Date().toISOString();
  return {
    id,
    content: body,
    kind: fm.kind === 'word' ? 'word' : 'note',
    priority,
    status: (fm.status || 'inbox') as Status,
    tags: Array.isArray(tagIds) ? tagIds : [],
    created_at,
    updated_at: fm.updated_at || created_at,
    deleted_at: fm.deleted_at && fm.deleted_at !== 'null' ? fm.deleted_at : null,
  };
}

function parseTag(text: string): TagRecord | null {
  const { frontmatter: fm } = parse(text);
  const id = fm.id;
  if (!id) return null;
  const created_at = fm.created_at || new Date().toISOString();
  return {
    id,
    name: fm.name ?? '',
    created_at,
    updated_at: fm.updated_at || created_at,
    deleted_at: fm.deleted_at && fm.deleted_at !== 'null' ? fm.deleted_at : null,
  };
}

// ── 加载 + 冲突处理（按文件内部 id 去重，last-write-wins） ─────────────────

interface RawRecord {
  name: string;
  content: string;
}

async function loadCollection<T extends { id: string; updated_at: string }>(
  subs: string[],
  placeFn: (rec: T) => string,
  parseFn: (text: string) => T | null,
  serializeFn: (rec: T) => string,
  target: Map<string, T>,
  where: Map<string, string>,
): Promise<void> {
  // 读所有位置，按 id 分桶
  const groups = new Map<string, Array<{ sub: string; name: string; text: string; rec: T }>>();
  for (const sub of subs) {
    const raw = await invoke<RawRecord[]>('list_records', { dir: dataDir, sub });
    for (const f of raw) {
      const rec = parseFn(f.content);
      if (!rec) continue;
      const arr = groups.get(rec.id) ?? [];
      arr.push({ sub, name: f.name, text: f.content, rec });
      groups.set(rec.id, arr);
    }
  }

  for (const [id, group] of groups) {
    const canonical = `${id}.md`;
    // updated_at 最新者胜出；相等时优先规范文件名，再优先已在正确位置的
    const rank = (g: (typeof group)[number]) =>
      (g.name === canonical ? 0 : 2) + (g.sub === placeFn(g.rec) ? 0 : 1);
    group.sort((a, b) => {
      const c = b.rec.updated_at.localeCompare(a.rec.updated_at);
      return c !== 0 ? c : rank(a) - rank(b);
    });
    const winner = group[0];
    const place = placeFn(winner.rec);
    target.set(id, winner.rec);
    where.set(id, place);

    // 落败文件：内容与胜者完全相同只是重复副本，直接清理；否则归档到 conflicts/（不删，留后悔药）
    for (const loser of group.slice(1)) {
      if (loser.text === winner.text) {
        await invoke('remove_record', { dir: dataDir, sub: loser.sub, name: loser.name });
      } else {
        await invoke('move_to_conflicts', { dir: dataDir, sub: loser.sub, name: loser.name });
      }
    }

    if (winner.name !== canonical) {
      // 同步工具的冲突副本命名：胜出内容落到 <place>/<id>.md，原文件归档
      await invoke('write_record_atomic', {
        dir: dataDir,
        sub: place,
        name: canonical,
        content: serializeFn(winner.rec),
      });
      await invoke('move_to_conflicts', { dir: dataDir, sub: winner.sub, name: winner.name });
    } else if (winner.sub !== place) {
      // 只是放错目录：原样挪回（字节不变）
      await invoke('move_record', {
        dir: dataDir,
        fromSub: winner.sub,
        toSub: place,
        name: canonical,
      });
    }
  }
}

async function loadAll(): Promise<void> {
  dataDir = await invoke<string>('get_data_dir');
  items.clear();
  tags.clear();
  itemPlace.clear();
  await loadCollection(ITEM_PLACES, placeOf, parseItem, itemToFile, items, itemPlace);
  await loadCollection(['tags'], () => 'tags', parseTag, tagToFile, tags, new Map());
}

// ── 写辅助 ───────────────────────────────────────────────────────────────

async function persistItem(r: ItemRecord): Promise<void> {
  const name = `${r.id}.md`;
  const place = placeOf(r);
  // 先写新位置，再清理旧位置：中途失败最多留一份重复，下次加载自动去重
  await invoke('write_record_atomic', { dir: dataDir, sub: place, name, content: itemToFile(r) });
  const old = itemPlace.get(r.id);
  if (old && old !== place) {
    await invoke('remove_record', { dir: dataDir, sub: old, name });
  }
  itemPlace.set(r.id, place);
}

async function persistTag(r: TagRecord): Promise<void> {
  await invoke('write_record_atomic', {
    dir: dataDir,
    sub: 'tags',
    name: `${r.id}.md`,
    content: tagToFile(r),
  });
}

function toItem(r: ItemRecord): Item {
  return {
    id: r.id,
    content: r.content,
    kind: r.kind,
    priority: r.priority,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at,
  };
}

// ── Item 操作 ────────────────────────────────────────────────────────────

export async function createItem(content: string, kind: Kind = 'note'): Promise<Item> {
  await ensureLoaded();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const r: ItemRecord = {
    id,
    content,
    kind,
    priority: null,
    status: 'inbox',
    tags: [],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  items.set(id, r);
  await persistItem(r);
  return toItem(r);
}

export async function updateItemContent(id: string, content: string): Promise<void> {
  await ensureLoaded();
  const r = items.get(id);
  if (!r) return;
  r.content = content;
  r.updated_at = new Date().toISOString();
  await persistItem(r);
}

export async function setPriority(id: string, priority: Priority | null): Promise<void> {
  await ensureLoaded();
  const r = items.get(id);
  if (!r) return;
  r.priority = priority;
  r.updated_at = new Date().toISOString();
  await persistItem(r);
}

export async function setStatus(id: string, status: Status): Promise<void> {
  await ensureLoaded();
  const r = items.get(id);
  if (!r) return;
  r.status = status;
  r.updated_at = new Date().toISOString();
  await persistItem(r);
}

/** 单词 ↔ 普通条目 手动切换（只改 kind，其余字段保留） */
export async function setKind(id: string, kind: Kind): Promise<void> {
  await ensureLoaded();
  const r = items.get(id);
  if (!r) return;
  r.kind = kind;
  r.updated_at = new Date().toISOString();
  await persistItem(r);
}

export async function softDeleteItem(id: string): Promise<void> {
  await ensureLoaded();
  const r = items.get(id);
  if (!r) return;
  const now = new Date().toISOString();
  r.deleted_at = now;
  r.updated_at = now;
  await persistItem(r); // 只写 deleted_at，文件保留作墓碑
}

export interface ListFilter {
  status?: string;
  priority?: number | null;
  tagId?: string;
  search?: string;
}

export async function listItems(filter: ListFilter = {}): Promise<Item[]> {
  await ensureLoaded();
  let arr = [...items.values()].filter((r) => r.deleted_at === null && r.kind !== 'word');

  if (filter.status !== undefined) arr = arr.filter((r) => r.status === filter.status);
  if (filter.priority !== undefined) {
    arr =
      filter.priority === null
        ? arr.filter((r) => r.priority === null)
        : arr.filter((r) => r.priority === filter.priority);
  }
  if (filter.tagId) arr = arr.filter((r) => r.tags.includes(filter.tagId!));
  if (filter.search) {
    const q = filter.search.toLowerCase();
    arr = arr.filter((r) => r.content.toLowerCase().includes(q));
  }

  arr.sort((a, b) => b.created_at.localeCompare(a.created_at)); // created_at DESC
  return arr.map(toItem);
}

export async function listActiveP1Items(): Promise<Item[]> {
  await ensureLoaded();
  return [...items.values()]
    .filter(
      (r) =>
        r.deleted_at === null &&
        r.kind !== 'word' &&
        r.priority === 1 &&
        r.status !== 'done' &&
        r.status !== 'archived',
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toItem);
}

export async function countInbox(): Promise<number> {
  await ensureLoaded();
  let n = 0;
  for (const r of items.values()) {
    if (r.deleted_at === null && r.kind !== 'word' && r.status === 'inbox') n++;
  }
  return n;
}

/** 距今超过 days 天未更新、状态非 done/archived、未删除的条目 */
export async function listStale(days: number): Promise<Item[]> {
  await ensureLoaded();
  const cutoff = Date.now() - days * 86400000;
  return [...items.values()]
    .filter(
      (r) =>
        r.deleted_at === null &&
        r.kind !== 'word' &&
        r.status !== 'done' &&
        r.status !== 'archived' &&
        new Date(r.updated_at).getTime() < cutoff,
    )
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at)) // updated_at ASC
    .map(toItem);
}

/** 单词视图：未删除的单词，created_at DESC */
export async function listWords(): Promise<Item[]> {
  await ensureLoaded();
  return [...items.values()]
    .filter((r) => r.deleted_at === null && r.kind === 'word')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toItem);
}

export async function listItemTagMap(): Promise<
  Array<{ item_id: string; id: string; name: string }>
> {
  await ensureLoaded();
  const out: Array<{ item_id: string; id: string; name: string }> = [];
  for (const it of items.values()) {
    if (it.deleted_at !== null) continue;
    for (const tagId of it.tags) {
      const tag = tags.get(tagId);
      if (!tag || tag.deleted_at !== null) continue;
      out.push({ item_id: it.id, id: tag.id, name: tag.name });
    }
  }
  return out;
}

// ── Tag 操作 ─────────────────────────────────────────────────────────────

export async function softDeleteTag(id: string): Promise<void> {
  await ensureLoaded();
  const r = tags.get(id);
  if (!r) return;
  const now = new Date().toISOString();
  r.deleted_at = now;
  r.updated_at = now;
  await persistTag(r);
  // item 上的关联保留，listItemTagMap / listTags 已按 deleted_at 过滤
}

export async function listTags(): Promise<TagWithCount[]> {
  await ensureLoaded();
  const active = [...tags.values()].filter((t) => t.deleted_at === null);
  const result = active.map((t) => {
    let count = 0;
    for (const it of items.values()) {
      if (it.deleted_at === null && it.kind !== 'word' && it.tags.includes(t.id)) count++;
    }
    return { id: t.id, name: t.name, count };
  });
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export async function createTag(name: string): Promise<Tag> {
  await ensureLoaded();
  // 不过滤 deleted_at：同名软删标签复活，避免重复
  const existing = [...tags.values()].find((t) => t.name === name);
  if (existing) {
    if (existing.deleted_at !== null) {
      existing.deleted_at = null;
      existing.updated_at = new Date().toISOString();
      await persistTag(existing);
    }
    return { id: existing.id, name: existing.name };
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const r: TagRecord = { id, name, created_at: now, updated_at: now, deleted_at: null };
  tags.set(id, r);
  await persistTag(r);
  return { id, name };
}

export async function addTagToItem(itemId: string, tagId: string): Promise<void> {
  await ensureLoaded();
  const it = items.get(itemId);
  if (!it) return;
  if (!it.tags.includes(tagId)) it.tags.push(tagId);
  it.updated_at = new Date().toISOString();
  await persistItem(it);
}

export async function removeTagFromItem(itemId: string, tagId: string): Promise<void> {
  await ensureLoaded();
  const it = items.get(itemId);
  if (!it) return;
  it.tags = it.tags.filter((t) => t !== tagId);
  it.updated_at = new Date().toISOString();
  await persistItem(it);
}
