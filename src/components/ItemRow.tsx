import { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import type { Item, Priority, Tag, TagWithCount } from '../types';
import { relativeTime } from '../lib/time';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import TagPicker from './TagPicker';

const PRIORITY_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' };
const PRIORITY_COLOR: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  3: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
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

  // 高度随内容自适应,上限为窗口高度 60%,超出才滚动
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // border-box 下 scrollHeight 不含边框,需补上,否则会多出 2px 滚动条
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight + border, Math.round(window.innerHeight * 0.6))}px`;
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      autoResize();
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
    <div className="group flex gap-3 px-4 py-3 border-b border-line-soft hover:bg-wash">
      {onToggleDone && (
        <button
          onClick={onToggleDone}
          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-line-strong flex items-center justify-center hover:border-fg-muted"
          title={isDone ? s.item_toggle_undone : s.item_toggle_done}
        >
          {isDone && <span className="text-ok text-xs leading-none">✓</span>}
        </button>
      )}

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              autoResize();
            }}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditValue(item.content);
                setIsEditing(false);
              }
            }}
            rows={3}
            className="w-full min-h-[4.5rem] overflow-y-auto text-sm border border-accent/50 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-accent/70 bg-surface text-fg"
          />
        ) : (
          <div
            className={`text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert ${
              isDone ? 'line-through text-fg-faint' : 'text-fg-2'
            } ${onUpdateContent ? 'cursor-text' : ''}`}
            onClick={() => {
              if (!onUpdateContent) return;
              // 拖选文字准备复制时不进入编辑,避免选区丢失
              if (window.getSelection()?.toString()) return;
              setIsEditing(true);
            }}
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
            className="text-xs text-fg-faint"
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
                    : 'border-line text-fg-muted hover:border-line-strong'
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
            className="text-xs px-2 py-0.5 rounded border border-line text-fg-muted hover:border-line-strong hover:text-fg-2 whitespace-nowrap"
          >
            {s.item_btn_todo}
          </button>
        )}

        {onArchive && (
          <button
            onClick={onArchive}
            className="text-xs px-2 py-0.5 rounded border border-line text-fg-muted hover:border-line-strong hover:text-fg-2"
          >
            {s.item_btn_archive}
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="text-xs px-2 py-0.5 rounded border border-line text-danger/80 hover:border-danger/50 hover:text-danger"
          >
            {s.item_btn_delete}
          </button>
        )}
      </div>
    </div>
  );
}
