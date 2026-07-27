import { useEffect, useState, useCallback } from 'react';
import { Task, TaskStatus } from '@quickboard/types';
import { supabase } from '../lib/supabase';

export function useTasks(boardId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!boardId) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (err) {
        setError(err.message);
      } else {
        setTasks(data || []);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch tasks';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    fetchTasks();

    const taskChannel = supabase
      .channel(`realtime:mobile:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks((prev) => [...prev.filter((t) => t.id !== newTask.id), newTask]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task;
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
    };
  }, [boardId, fetchTasks]);

  const cycleStatus = async (task: Task) => {
    const nextStatusMap: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const newStatus = nextStatusMap[task.status];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    try {
      const { error: err } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (err) {
        setError(err.message);
        // Rollback
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update task status';
      setError(msg);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  };

  // Source of truth for new tasks: the realtime INSERT event (lines 55-57 above).
  // createTask only fires the insert; the realtime listener updates state.
  const createTask = async (
    title: string,
    boardId: string,
    userId: string
  ): Promise<string | null> => {
    const trimmed = title.trim();
    if (!trimmed) return 'Task title is required.';
    if (trimmed.length > 200) return 'Task title must be 200 characters or fewer.';

    try {
      const { error: err } = await supabase
        .from('tasks')
        .insert({ board_id: boardId, owner_id: userId, title: trimmed, status: 'todo' });

      if (err) return err.message;
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : 'Failed to create task.';
    }
  };

  // Realtime DELETE event (lines 61-63) handles state update — no local setTasks needed here.
  const deleteTask = async (taskId: string): Promise<string | null> => {
    try {
      const { error: err } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (err) return err.message;
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : 'Failed to delete task.';
    }
  };

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    cycleStatus,
    createTask,
    deleteTask,
    setTasks,
  };
}
