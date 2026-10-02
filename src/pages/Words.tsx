import { useItemsStore } from '../stores/itemsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import ItemRow from '../components/ItemRow';

export default function Words() {
  const { words, setKind, deleteItem, updateContent } = useItemsStore();
  const lang = useSettingsStore((s) => s.lang);
  const s = STRINGS[lang];

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-fg-2 mb-4">
        {s.words_title}
        {words.length > 0 && (
          <span className="ml-2 text-xs font-normal text-fg-faint">
            {s.allitems_count(words.length)}
          </span>
        )}
      </h2>

      {words.length === 0 ? (
        <p className="text-sm text-fg-faint py-12 text-center">{s.words_empty}</p>
      ) : (
        <div className="rounded-lg border border-line overflow-hidden">
          {words.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onUpdateContent={(c) => updateContent(item.id, c)}
              onSwitchKind={() => setKind(item.id, 'note')}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
