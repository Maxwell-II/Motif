export type Priority = 1 | 2 | 3;
export type Status = 'inbox' | 'todo' | 'done' | 'archived';

export interface Item {
  id: string;
  content: string;
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
