import { useState, useRef } from 'react';
import type { Tag, TagWithCount } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';

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
          className="inline-flex items-center gap-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded"
        >
          {tag.name}
          <button
            onClick={() => onRemove(tag.id)}
            className="ml-0.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 leading-none"
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
        className="text-xs text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 px-1 py-0.5 rounded border border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        {s.tag_add_btn}
      </button>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (showCreate) handleCreate();
                else if (filtered.length > 0) handleSelect(filtered[0]);
                else if (exactMatch && !currentTagIds.has(exactMatch.id)) handleSelect(exactMatch);
              }
              if (e.key === 'Escape') setIsOpen(false);
            }}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder={s.tag_search_placeholder}
            className="w-full px-2 py-1.5 text-xs border-b border-gray-100 dark:border-gray-700 outline-none rounded-t-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <ul className="max-h-32 overflow-y-auto">
            {filtered.map((tag) => (
              <li key={tag.id}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(tag)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  {tag.name}
                  <span className="text-gray-300 dark:text-gray-600 ml-1">{tag.count}</span>
                </button>
              </li>
            ))}
            {showCreate && (
              <li>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreate}
                  className="w-full text-left px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  {s.tag_create(input.trim())}
                </button>
              </li>
            )}
            {filtered.length === 0 && !showCreate && (
              <li className="px-2 py-1.5 text-xs text-gray-300 dark:text-gray-600">{s.tag_no_match}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
