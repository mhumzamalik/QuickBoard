export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Board {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  owner_id: string;
  title: string;
  status: TaskStatus;
  sketch_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  is_online: boolean;
  last_seen_at: string;
}
