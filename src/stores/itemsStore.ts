import { create } from 'zustand';
import type { Item, Priority, Status, Tag, TagWithCount } from '../types';
import * as repo from '../db/repo';

type Page = 'overview' | 'inbox' | 'all';

interface ItemsState {
  currentPage: Page;
  overviewItems: Item[];
  inboxItems: Item[];
  allItems: Item[];
  inboxCount: number;
  // M3: tags & filters
  tags: TagWithCount[];
  itemTags: Record<string, Tag[]>;
  search: string;
  statusFilter: string | null;
  priorityFilter: 1 | 2 | 3 | null;
  tagFilter: string | null;
  // M4: stale items
  staleItems: Item[];

  setPage: (page: Page) => void;
  load: () => Promise<void>;
  reloadFromDisk: () => Promise<void>;
  addItem: (content: string) => Promise<void>;
  updateContent: (id: string, content: string) => Promise<void>;
  setPriority: (id: string, priority: Priority | null) => Promise<void>;
  setStatus: (id: string, status: Status) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  // M4.5: focus signal for search box
  focusSearch: boolean;
  triggerFocusSearch: () => void;
  clearFocusSearch: () => void;
  // M3 filter setters
  setSearch: (s: string) => void;
  setStatusFilter: (s: string | null) => void;
  setPriorityFilter: (p: 1 | 2 | 3 | null) => void;
  setTagFilter: (tagId: string | null) => void;
  clearFilters: () => void;
  // M3 tag actions
  addTag: (itemId: string, tagId: string) => Promise<void>;
  removeTag: (itemId: string, tagId: string) => Promise<void>;
  createAndAddTag: (itemId: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  currentPage: 'overview',
  overviewItems: [],
  inboxItems: [],
  allItems: [],
  inboxCount: 0,
  tags: [],
  itemTags: {},
  staleItems: [],
  focusSearch: false,
  search: '',
  statusFilter: null,
  priorityFilter: null,
  tagFilter: null,

  setPage: (page) => set({ currentPage: page }),

  load: async () => {
    const state = get();
    const allItemsFilter: repo.ListFilter = {};
    if (state.statusFilter !== null) allItemsFilter.status = state.statusFilter;
    if (state.priorityFilter !== null) allItemsFilter.priority = state.priorityFilter;
    if (state.tagFilter !== null) allItemsFilter.tagId = state.tagFilter;
    if (state.search) allItemsFilter.search = state.search;

    const [overviewItems, inboxItems, allItems, inboxCount, tags, rawItemTags, staleItems] = await Promise.all([
      repo.listActiveP1Items(),
      repo.listItems({ status: 'inbox' }),
      repo.listItems(allItemsFilter),
      repo.countInbox(),
      repo.listTags(),
      repo.listItemTagMap(),
      repo.listStale(14),
    ]);

    const itemTags: Record<string, Tag[]> = {};
    for (const row of rawItemTags) {
      if (!itemTags[row.item_id]) itemTags[row.item_id] = [];
      itemTags[row.item_id].push({ id: row.id, name: row.name });
    }

    set({ overviewItems, inboxItems, allItems, inboxCount, tags, itemTags, staleItems });
  },

  // 从磁盘重新加载（焦点/收到 item-created 时用）。各窗口 repo 缓存独立，
  // 别的窗口写了文件后，本窗口必须重读磁盘才能看到。
  reloadFromDisk: async () => {
    await repo.reload();
    await get().load();
  },

  addItem: async (content) => {
    await repo.createItem(content);
    await get().load();
  },

  updateContent: async (id, content) => {
    await repo.updateItemContent(id, content);
    await get().load();
  },

  setPriority: async (id, priority) => {
    await repo.setPriority(id, priority);
    await get().load();
  },

  setStatus: async (id, status) => {
    await repo.setStatus(id, status);
    await get().load();
  },

  deleteItem: async (id) => {
    await repo.softDeleteItem(id);
    await get().load();
  },

  triggerFocusSearch: () => set({ focusSearch: true }),
  clearFocusSearch: () => set({ focusSearch: false }),

  setSearch: (s) => set({ search: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setPriorityFilter: (p) => set({ priorityFilter: p }),
  setTagFilter: (tagId) => set({ tagFilter: tagId }),
  clearFilters: () => set({ search: '', statusFilter: null, priorityFilter: null, tagFilter: null }),

  addTag: async (itemId, tagId) => {
    await repo.addTagToItem(itemId, tagId);
    await get().load();
  },

  removeTag: async (itemId, tagId) => {
    await repo.removeTagFromItem(itemId, tagId);
    await get().load();
  },

  createAndAddTag: async (itemId, name) => {
    const tag = await repo.createTag(name);
    await repo.addTagToItem(itemId, tag.id);
    await get().load();
  },

  deleteTag: async (id) => {
    await repo.softDeleteTag(id);
    await get().load();
  },
}));
