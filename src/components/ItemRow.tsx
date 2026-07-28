import { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import type { Item, Priority, Tag, TagWithCount } from '../types';
import { relativeTime } from '../lib/time';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import TagPicker from './TagPicker';

const PRIORITY_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' };
const PRIORITY_COLOR: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  3: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

interface ItemRowProps {
  item: Item;
  onToggleDone?: () => void;
  onSetPriority?: (p: Priority | null) => void;
  onSetTodo?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onUpdateContent?: (content: string) => void;
  currentTags?: Tag[];
  allTags?: TagWithCount[];
  onAddTag?: (tag: Tag) => void;
  onRemoveTag?: (tagId: string) => void;
  onCreateTag?: (name: string) => void;
}

export default function ItemRow({
  item,
  onToggleDone,
  onSetPriority,
  onSetTodo,
  onArchive,
  onDelete,
  onUpdateContent,
  currentTags,
  allTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: ItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lang = useSettingsStore((s) => s.lang);
  const s = STRINGS[lang];

  useEffect(() => {
    setEditValue(item.content);
  }, [item.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== item.content) {
      onUpdateContent?.(trimmed);
    }
    setIsEditing(false);
  };

  const isDone = item.status === 'done';

  return (
    <div className="group flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {onToggleDone && (
        <button
          onClick={onToggleDone}
          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-gray-500 dark:hover:border-gray-400"
          title={isDone ? s.item_toggle_undone : s.item_toggle_done}
        >
          {isDone && <span className="text-green-600 dark:text-green-400 text-xs leading-none">✓</span>}
        </button>
      )}

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditValue(item.content);
                setIsEditing(false);
              }
            }}
            rows={3}
            className="w-full text-sm border border-blue-300 dark:border-blue-700 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        ) : (
          <div
            className={`text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert ${
              isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
            } ${onUpdateContent ? 'cursor-text' : ''}`}
            onClick={() => onUpdateContent && setIsEditing(true)}
          >
            <Markdown>{item.content}</Markdown>
          </div>
        )}

        <div className="flex items-center flex-wrap gap-2 mt-1">
          {item.priority && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLOR[item.priority]}`}>
              {PRIORITY_LABEL[item.priority]}
            </span>
          )}
          <span
            className="text-xs text-gray-400 dark:text-gray-500"
            title={new Date(item.created_at).toLocaleString(s.time_locale)}
          >
            {relativeTime(item.created_at, lang)}
          </span>
          {allTags !== undefined && (
            <TagPicker
              currentTags={currentTags ?? []}
              allTags={allTags}
              onAdd={(tag) => onAddTag?.(tag)}
              onRemove={(tagId) => onRemoveTag?.(tagId)}
              onCreate={(name) => onCreateTag?.(name)}
            />
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onSetPriority && (
          <div className="flex gap-0.5">
            {([1, 2, 3] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => onSetPriority(item.priority === p ? null : p)}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                  item.priority === p
                    ? PRIORITY_COLOR[p] + ' border-transparent'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                P{p}
              </button>
            ))}
          </div>
        )}

        {onSetTodo && (
          <button
            onClick={onSetTodo}
            className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap"
          >
            {s.item_btn_todo}
          </button>
        )}

        {onArchive && (
          <button
            onClick={onArchive}
            className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {s.item_btn_archive}
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-red-400 dark:text-red-500 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400"
          >
            {s.item_btn_delete}
          </button>
        )}
      </div>
    </div>
  );
}
