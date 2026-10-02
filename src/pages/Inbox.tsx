import { useItemsStore } from '../stores/itemsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import ItemRow from '../components/ItemRow';
import type { Priority } from '../types';

export default function Inbox() {
  const {
    inboxItems, setPriority, setStatus, setKind, deleteItem,
    tags, itemTags, addTag, removeTag, createAndAddTag,
  } = useItemsStore();
  const lang = useSettingsStore((s) => s.lang);
  const s = STRINGS[lang];

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-fg-2 mb-4">
        {s.inbox_title}
        {inboxItems.length > 0 && (
          <span className="ml-2 text-xs font-normal text-fg-faint">
            {s.allitems_count(inboxItems.length)}
          </span>
        )}
      </h2>

      {inboxItems.length === 0 ? (
        <p className="text-sm text-fg-faint py-12 text-center">{s.inbox_empty}</p>
      ) : (
        <div className="rounded-lg border border-line overflow-hidden">
          {inboxItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onSetPriority={(p: Priority | null) => setPriority(item.id, p)}
              onSetTodo={() => setStatus(item.id, 'todo')}
              onArchive={() => setStatus(item.id, 'archived')}
              onSwitchKind={() => setKind(item.id, 'word')}
              onDelete={() => deleteItem(item.id)}
              currentTags={itemTags[item.id] ?? []}
              allTags={tags}
              onAddTag={(tag) => addTag(item.id, tag.id)}
              onRemoveTag={(tagId) => removeTag(item.id, tagId)}
              onCreateTag={(name) => createAndAddTag(item.id, name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
