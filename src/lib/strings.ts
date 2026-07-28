export type Lang = 'zh' | 'en';

// 修饰键名按平台显示:macOS 为 Cmd,其余为 Ctrl(全局快捷键在 Rust 侧用 CmdOrCtrl 注册)
const isMac =
  typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
const MOD = isMac ? 'Cmd' : 'Ctrl';

export interface LangStrings {
  nav_overview: string;
  nav_inbox: string;
  nav_all: string;
  sidebar_tags: string;
  sidebar_export: string;
  sidebar_export_success: (count: number) => string;
  sidebar_export_fail: string;
  sidebar_theme_label: string;
  sidebar_theme_light: string;
  sidebar_theme_dark: string;
  sidebar_theme_system: string;
  sidebar_lang_label: string;
  sidebar_datadir_label: string;
  sidebar_datadir_change: string;
  sidebar_datadir_changed: string;
  settings_label: string;
  quickadd_placeholder: string;
  quickadd_button: string;
  overview_p1_title: string;
  overview_p1_empty: string;
  overview_inbox_title: string;
  overview_inbox_empty: string;
  overview_inbox_pending: (count: number) => string;
  overview_tags_title: string;
  overview_stale_title: string;
  overview_stale_empty: string;
  tag_count: (count: number) => string;
  inbox_title: string;
  inbox_empty: string;
  allitems_title: string;
  allitems_empty_filter: string;
  allitems_empty: string;
  allitems_search_placeholder: string;
  allitems_clear_filter: string;
  allitems_count: (count: number) => string;
  status_inbox: string;
  status_todo: string;
  status_done: string;
  status_archived: string;
  item_toggle_done: string;
  item_toggle_undone: string;
  item_btn_todo: string;
  item_btn_archive: string;
  item_btn_delete: string;
  tag_add_btn: string;
  tag_search_placeholder: string;
  tag_create: (name: string) => string;
  tag_no_match: string;
  tag_delete_confirm: (count: number) => string;
  tag_delete_title: string;
  capture_placeholder: string;
  tray_open_main: string;
  tray_quick_capture: string;
  tray_quit: string;
  tray_shortcut_err: string;
  time_locale: string;
}

export const STRINGS: Record<Lang, LangStrings> = {
  zh: {
    nav_overview: '概览',
    nav_inbox: '收件箱',
    nav_all: '全部条目',
    sidebar_tags: '标签',
    sidebar_export: '导出全部为 Markdown',
    sidebar_export_success: (count) => `已导出 ${count} 个文件`,
    sidebar_export_fail: '导出失败',
    sidebar_theme_label: '主题',
    sidebar_theme_light: '浅色',
    sidebar_theme_dark: '深色',
    sidebar_theme_system: '系统',
    sidebar_lang_label: '语言',
    sidebar_datadir_label: '数据目录',
    sidebar_datadir_change: '更改…',
    sidebar_datadir_changed: '已切换数据目录',
    settings_label: '设置',
    quickadd_placeholder: '快速记录一条想法…',
    quickadd_button: '记录',
    overview_p1_title: '优先级 P1',
    overview_p1_empty: '暂无 P1 事项',
    overview_inbox_title: '收件箱',
    overview_inbox_empty: '收件箱已清空',
    overview_inbox_pending: (count) => `有 ${count} 条待整理 →`,
    overview_tags_title: '标签统计',
    overview_stale_title: '久未更新（>14 天）',
    overview_stale_empty: '暂无久未更新的事项',
    tag_count: (count) => `${count} 条`,
    inbox_title: '收件箱',
    inbox_empty: '收件箱已清空',
    allitems_title: '全部条目',
    allitems_empty_filter: '没有符合条件的条目',
    allitems_empty: '还没有任何条目',
    allitems_search_placeholder: `搜索内容… (${MOD}+F 或 / 聚焦)`,
    allitems_clear_filter: '清除筛选',
    allitems_count: (count) => `${count} 条`,
    status_inbox: '收件箱',
    status_todo: '待办',
    status_done: '完成',
    status_archived: '已归档',
    item_toggle_done: '标为完成',
    item_toggle_undone: '取消完成',
    item_btn_todo: '待办',
    item_btn_archive: '归档',
    item_btn_delete: '删除',
    tag_add_btn: '+ 标签',
    tag_search_placeholder: '搜索或新建标签…',
    tag_create: (name) => `新建「${name}」`,
    tag_no_match: '无匹配标签',
    tag_delete_confirm: (count) =>
      `仍有 ${count} 条条目使用该标签，删除后条目本身不受影响，确定删除？`,
    tag_delete_title: '删除标签',
    capture_placeholder: '记录一条想法… (Enter 保存，Shift+Enter 换行，Esc 取消)',
    tray_open_main: '打开主窗口',
    tray_quick_capture: '快速捕获',
    tray_quit: '退出',
    tray_shortcut_err: `⚠ ${MOD}+Shift+Space 快捷键注册失败`,
    time_locale: 'zh-CN',
  },
  en: {
    nav_overview: 'Overview',
    nav_inbox: 'Inbox',
    nav_all: 'All Items',
    sidebar_tags: 'Tags',
    sidebar_export: 'Export All as Markdown',
    sidebar_export_success: (count) => `Exported ${count} files`,
    sidebar_export_fail: 'Export failed',
    sidebar_theme_label: 'Theme',
    sidebar_theme_light: 'Light',
    sidebar_theme_dark: 'Dark',
    sidebar_theme_system: 'System',
    sidebar_lang_label: 'Language',
    sidebar_datadir_label: 'Data folder',
    sidebar_datadir_change: 'Change…',
    sidebar_datadir_changed: 'Data folder switched',
    settings_label: 'Settings',
    quickadd_placeholder: 'Quick note…',
    quickadd_button: 'Add',
    overview_p1_title: 'Priority P1',
    overview_p1_empty: 'No P1 items',
    overview_inbox_title: 'Inbox',
    overview_inbox_empty: 'Inbox is empty',
    overview_inbox_pending: (count) => `${count} items to process →`,
    overview_tags_title: 'Tag Stats',
    overview_stale_title: 'Stale (>14 days)',
    overview_stale_empty: 'No stale items',
    tag_count: (count) => `${count}`,
    inbox_title: 'Inbox',
    inbox_empty: 'Inbox is empty',
    allitems_title: 'All Items',
    allitems_empty_filter: 'No matching items',
    allitems_empty: 'No items yet',
    allitems_search_placeholder: `Search… (${MOD}+F or / to focus)`,
    allitems_clear_filter: 'Clear filters',
    allitems_count: (count) => `${count} items`,
    status_inbox: 'Inbox',
    status_todo: 'Todo',
    status_done: 'Done',
    status_archived: 'Archived',
    item_toggle_done: 'Mark done',
    item_toggle_undone: 'Unmark done',
    item_btn_todo: 'Todo',
    item_btn_archive: 'Archive',
    item_btn_delete: 'Delete',
    tag_add_btn: '+ Tag',
    tag_search_placeholder: 'Search or create tag…',
    tag_create: (name) => `Create "${name}"`,
    tag_no_match: 'No matching tags',
    tag_delete_confirm: (count) =>
      `${count} item(s) use this tag. Items won't be affected. Delete tag?`,
    tag_delete_title: 'Delete tag',
    capture_placeholder:
      'Capture a thought… (Enter to save, Shift+Enter for newline, Esc to cancel)',
    tray_open_main: 'Open Main Window',
    tray_quick_capture: 'Quick Capture',
    tray_quit: 'Quit',
    tray_shortcut_err: `⚠ ${MOD}+Shift+Space shortcut failed to register`,
    time_locale: 'en-US',
  },
};
