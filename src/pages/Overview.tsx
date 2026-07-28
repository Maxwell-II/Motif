import { useItemsStore } from '../stores/itemsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { STRINGS } from '../lib/strings';
import ItemRow from '../components/ItemRow';
import type { Priority } from '../types';

export default function Overview() {
  const {
    overviewItems, inboxCount, staleItems, tags,
    setPage, setStatus, setPriority, setTagFilter,
  } = useItemsStore();
  const lang = useSettingsStore((s) => s.lang);
  const s = STRINGS[lang];

  const sortedTags = [...tags].sort((a, b) => b.count - a.count);

  return (
    <div className="p-6 max-w-2xl space-y-8">
      {/* ① P1 重点条目 */}
      <section>
        <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          {s.overview_p1_title}
        </h3>
        {overviewItems.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">{s.overview_p1_empty}</p>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {overviewItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggleDone={() => setStatus(item.id, item.status === 'done' ? 'todo' : 'done')}
                onSetPriority={(p: Priority | null) => setPriority(item.id, p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ② 收件箱提示 */}
      <section>
        <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          {s.overview_inbox_title}
        </h3>
        {inboxCount > 0 ? (
          <button
            onClick={() => setPage('inbox')}
            className="w-full text-left px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
          >
            {s.overview_inbox_pending(inboxCount)}
          </button>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-2 text-center">{s.overview_inbox_empty}</p>
        )}
      </section>

      {/* ③ 标签统计 */}
      {sortedTags.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {s.overview_tags_title}
          </h3>
          <div className="space-y-1">
            {sortedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { setTagFilter(tag.id); setPage('all'); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-600 dark:text-gray-400">#{tag.name}</span>
                <span className="text-gray-400 dark:text-gray-500">{s.tag_count(tag.count)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ④ 沉底区：久未更新 */}
      <section>
        <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          {s.overview_stale_title}
          {staleItems.length > 0 && (
            <span className="ml-2 normal-case font-normal text-amber-500 dark:text-amber-400">
              {s.allitems_count(staleItems.length)}
            </span>
          )}
        </h3>
        {staleItems.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-2 text-center">{s.overview_stale_empty}</p>
        ) : (
          <div className="rounded-lg border border-amber-100 dark:border-amber-900 overflow-hidden">
            {staleItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggleDone={() => setStatus(item.id, 'done')}
                onSetPriority={(p: Priority | null) => setPriority(item.id, p)}
                onArchive={() => setStatus(item.id, 'archived')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
