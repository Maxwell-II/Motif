export type Priority = 1 | 2 | 3;
export type Status = 'inbox' | 'todo' | 'done' | 'archived';
/** note = 普通条目;word = 单词(M5.6,捕获时 `w ` 前缀) */
export type Kind = 'note' | 'word';

export interface Item {
  id: string;
  content: string;
  kind: Kind;
  priority: Priority | null;
  status: Status;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export interface TagWithCount extends Tag {
  count: number;
}
