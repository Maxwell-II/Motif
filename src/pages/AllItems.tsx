import { useEffect, useRef, useState } from 'react';
import { useItemsStore } from '../stores/itemsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import ItemRow from '../components/ItemRow';
import type { Priority } from '../types';

const STATUS_OPTIONS = ['inbox', 'todo', 'done', 'archived'] as const;
const PRIORITY_OPTIONS = [1, 2, 3] as const;

export default function AllItems() {
  const {
    allItems, setPriority, setStatus, deleteItem, updateContent,
    tags, itemTags, addTag, removeTag, createAndAddTag,
    search, statusFilter, priorityFilter, tagFilter,
    setSearch, setStatusFilter, setPriorityFilter, setTagFilter, clearFilters,
    focusSearch, clearFocusSearch,
    load,
  } = useItemsStore();
  const lang = useSettingsStore((s) => s.lang);
  const s = STRINGS[lang];

  const [searchInput, setSearchInput] = useState(search);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, priorityFilter, tagFilter]);

  useEffect(() => {
    if (focusSearch) {
      searchRef.current?.focus();
      clearFocusSearch();
    }
  }, [focusSearch, clearFocusSearch]);

  const activeTag = tags.find((t) => t.id === tagFilter);
  const hasFilter = !!search || statusFilter !== null || priorityFilter !== null || tagFilter !== null;

  const STATUS_LABEL: Record<string, string> = {
    inbox: s.status_inbox,
    todo: s.status_todo,
    done: s.status_done,
    archived: s.status_archived,
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-fg-2 mb-3">{s.allitems_title}</h2>

      {/* 搜索框 */}
      <div className="flex gap-2 mb-3">
        <input
          ref={searchRef}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={s.allitems_search_placeholder}
          className="flex-1 text-sm border border-line rounded-md px-3 py-1.5 bg-surface text-fg focus:outline-none focus:border-line-strong placeholder:text-fg-ghost"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); setSearch(''); }}
            className="text-fg-faint hover:text-fg-muted px-1"
          >
            ×
          </button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-1.5 mb-4 items-center">
        {STATUS_OPTIONS.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(statusFilter === st ? null : st)}
            className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
              statusFilter === st
                ? 'bg-fg text-canvas border-fg'
                : 'border-line text-fg-muted hover:border-line-strong'
            }`}
          >
            {STATUS_LABEL[st]}
          </button>
        ))}

        <span className="text-line select-none">|</span>

        {PRIORITY_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
            className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
              priorityFilter === p
                ? 'bg-fg text-canvas border-fg'
                : 'border-line text-fg-muted hover:border-line-strong'
            }`}
          >
            P{p}
          </button>
        ))}

        {activeTag && (
          <>
            <span className="text-line select-none">|</span>
            <button
              onClick={() => setTagFilter(null)}
              className="text-xs px-2.5 py-0.5 rounded-full border bg-accent/10 text-accent border-accent/30 hover:bg-accent/20"
            >
              #{activeTag.name} ×
            </button>
          </>
        )}

        {hasFilter && (
          <button
            onClick={() => { setSearchInput(''); clearFilters(); }}
            className="text-xs text-fg-faint hover:text-fg-muted ml-1"
          >
            {s.allitems_clear_filter}
          </button>
        )}

        {allItems.length > 0 && (
          <span className="text-xs text-fg-faint ml-auto">
            {s.allitems_count(allItems.length)}
          </span>
        )}
      </div>

      {/* 条目列表 */}
      {allItems.length === 0 ? (
        <p className="text-sm text-fg-faint py-12 text-center">
          {hasFilter ? s.allitems_empty_filter : s.allitems_empty}
        </p>
      ) : (
        <div className="rounded-lg border border-line overflow-hidden">
          {allItems.map((item) => (
            <div key={item.id}>
              <ItemRow
                item={item}
                onToggleDone={() => setStatus(item.id, item.status === 'done' ? 'todo' : 'done')}
                onSetPriority={(p: Priority | null) => setPriority(item.id, p)}
                onDelete={() => deleteItem(item.id)}
                onUpdateContent={(c) => updateContent(item.id, c)}
                currentTags={itemTags[item.id] ?? []}
                allTags={tags}
                onAddTag={(tag) => addTag(item.id, tag.id)}
                onRemoveTag={(tagId) => removeTag(item.id, tagId)}
                onCreateTag={(name) => createAndAddTag(item.id, name)}
              />
              <div className="px-4 pb-1 text-xs text-fg-ghost">
                {STATUS_LABEL[item.status]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
