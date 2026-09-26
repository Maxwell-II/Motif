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
        <h3 className="text-xs font-medium text-fg-faint uppercase tracking-wider mb-2">
          {s.overview_p1_title}
        </h3>
        {overviewItems.length === 0 ? (
          <p className="text-sm text-fg-faint py-4 text-center">{s.overview_p1_empty}</p>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
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
        <h3 className="text-xs font-medium text-fg-faint uppercase tracking-wider mb-2">
          {s.overview_inbox_title}
        </h3>
        {inboxCount > 0 ? (
          <button
            onClick={() => setPage('inbox')}
            className="w-full flex items-center gap-2.5 text-left px-4 py-3 rounded-lg bg-surface border border-line text-sm text-fg hover:bg-wash hover:border-line-strong transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warn flex-shrink-0" />
            {s.overview_inbox_pending(inboxCount)}
          </button>
        ) : (
          <p className="text-sm text-fg-faint py-2 text-center">{s.overview_inbox_empty}</p>
        )}
      </section>

      {/* ③ 标签统计 */}
      {sortedTags.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-fg-faint uppercase tracking-wider mb-2">
            {s.overview_tags_title}
          </h3>
          <div className="space-y-1">
            {sortedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { setTagFilter(tag.id); setPage('all'); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-wash transition-colors"
              >
                <span className="text-fg-muted">#{tag.name}</span>
                <span className="text-fg-faint">{s.tag_count(tag.count)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ④ 沉底区：久未更新 */}
      <section>
        <h3 className="text-xs font-medium text-fg-faint uppercase tracking-wider mb-2">
          {s.overview_stale_title}
          {staleItems.length > 0 && (
            <span className="ml-2 normal-case font-normal text-warn">
              {s.allitems_count(staleItems.length)}
            </span>
          )}
        </h3>
        {staleItems.length === 0 ? (
          <p className="text-sm text-fg-faint py-2 text-center">{s.overview_stale_empty}</p>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
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
