import { useState, useRef } from 'react';
import type { Tag, TagWithCount } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import { isImeComposing } from '../lib/ime';

interface TagPickerProps {
  currentTags: Tag[];
  allTags: TagWithCount[];
  onAdd: (tag: Tag) => void;
  onRemove: (tagId: string) => void;
  onCreate: (name: string) => void;
}

export default function TagPicker({ currentTags, allTags, onAdd, onRemove, onCreate }: TagPickerProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lang = useSettingsStore((s) => s.lang);
  const s = STRINGS[lang];

  const currentTagIds = new Set(currentTags.map((t) => t.id));
  const filtered = allTags.filter(
    (t) => !currentTagIds.has(t.id) && t.name.toLowerCase().includes(input.toLowerCase()),
  );
  const exactMatch = allTags.find((t) => t.name.toLowerCase() === input.toLowerCase().trim());
  const showCreate = !!input.trim() && !exactMatch;

  const handleSelect = (tag: Tag) => {
    onAdd(tag);
    setInput('');
    setIsOpen(false);
  };

  const handleCreate = () => {
    const name = input.trim();
    if (!name) return;
    onCreate(name);
    setInput('');
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex flex-wrap gap-1 items-center">
      {currentTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-0.5 text-xs bg-selected text-fg-muted px-1.5 py-0.5 rounded"
        >
          {tag.name}
          <button
            onClick={() => onRemove(tag.id)}
            className="ml-0.5 text-fg-faint hover:text-danger leading-none"
          >
            ×
          </button>
        </span>
      ))}

      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="text-xs text-fg-ghost hover:text-fg-muted px-1 py-0.5 rounded border border-dashed border-line hover:border-line-strong transition-colors"
      >
        {s.tag_add_btn}
      </button>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-surface border border-line rounded-lg shadow-lg dark:shadow-black/40">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (isImeComposing(e)) return;
                e.preventDefault();
                if (showCreate) handleCreate();
                else if (filtered.length > 0) handleSelect(filtered[0]);
                else if (exactMatch && !currentTagIds.has(exactMatch.id)) handleSelect(exactMatch);
              }
              if (e.key === 'Escape') setIsOpen(false);
            }}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder={s.tag_search_placeholder}
            className="w-full px-2 py-1.5 text-xs border-b border-line outline-none rounded-t-lg bg-transparent text-fg placeholder:text-fg-faint"
          />
          <ul className="max-h-32 overflow-y-auto">
            {filtered.map((tag) => (
              <li key={tag.id}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(tag)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-selected text-fg-2"
                >
                  {tag.name}
                  <span className="text-fg-ghost ml-1">{tag.count}</span>
                </button>
              </li>
            ))}
            {showCreate && (
              <li>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreate}
                  className="w-full text-left px-2 py-1.5 text-xs text-accent hover:bg-accent/10"
                >
                  {s.tag_create(input.trim())}
                </button>
              </li>
            )}
            {filtered.length === 0 && !showCreate && (
              <li className="px-2 py-1.5 text-xs text-fg-ghost">{s.tag_no_match}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
