'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Board, Task, TaskStatus } from '@quickboard/types';
import { taskSchema } from '@/lib/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { CanvasModal } from '@/components/board/CanvasModal';
import { ArrowLeft, Plus, Trash2, Edit3, Image as ImageIcon, Users, CheckCircle2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface BoardPageProps {
  params: { id: string };
}

export default function BoardDetailPage({ params }: BoardPageProps) {
  const routeParams = useParams<{ id: string }>();
  const boardId = routeParams.id ?? params.id;
  const router = useRouter();
  const { showToast } = useToast();

  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [onlineUsers, setOnlineUsers] = useState<Array<{ user_id: string; display_name: string }>>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [editError, setEditError] = useState<string | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  const [canvasTask, setCanvasTask] = useState<Task | null>(null);

  const currentUserRef = useRef<{ id: string; email: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }
      currentUserRef.current = {
        id: userData.user.id,
        email: userData.user.email || 'Anonymous',
      };

      const { data: bData, error: bError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (bError || !bData) {
        showToast('Board not found', 'error');
        router.push('/dashboard');
        return;
      }
      setBoard(bData);

      const { data: tData, error: tError } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (tError) {
        logger.error('Error fetching tasks:', tError);
        showToast(tError.message, 'error');
      } else {
        setTasks(tData || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading board', 'error');
    } fontId:
    setIsLoading(false);
  }, [boardId, router, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!boardId) return;

    let taskChannel: ReturnType<typeof supabase.channel> | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      let user = currentUserRef.current;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        user = { id: data.user.id, email: data.user.email || 'Anonymous' };
        currentUserRef.current = user;
      }

      if (cancelled) return;

      const { id: userId, email: userEmail } = user;

      taskChannel = supabase
        .channel(`realtime:tasks:${boardId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `board_id=eq.${boardId}`,
          },
          (payload) => {
            logger.info('Realtime task event:', payload);
            if (payload.eventType === 'INSERT') {
              const newTask = payload.new as Task;
              setTasks((prev) => {
                if (prev.some((t) => t.id === newTask.id)) return prev;
                return [...prev, newTask];
              });
              showToast('New task added by collaborator', 'info');
            } else if (payload.eventType === 'UPDATE') {
              const updatedTask = payload.new as Task;
              setTasks((prev) =>
                prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setTasks((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        )
        .subscribe();

      presenceChannel = supabase.channel(`presence:board:${boardId}`, {
        config: { presence: { key: userId } },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel!.presenceState();
          const users: Array<{ user_id: string; display_name: string }> = [];
          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            if (presences && presences[0]) {
              users.push({
                user_id: key,
                display_name: presences[0].display_name || userEmail,
              });
            }
          });
          setOnlineUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel!.track({
              user_id: userId,
              display_name: userEmail.split('@')[0],
              online_at: new Date().toISOString(),
            });
          }
        });
    })();

    return () => {
      cancelled = true;
      if (taskChannel) supabase.removeChannel(taskChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [boardId, showToast]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(undefined);

    const validation = taskSchema.safeParse({ title: taskTitle, status: taskStatus });
    if (!validation.success) {
      setCreateError(validation.error.issues[0]?.message);
      return;
    }

    setIsCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      board_id: boardId,
      owner_id: userData.user.id,
      title: taskTitle,
      status: taskStatus,
      sketch_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, optimisticTask]);
    setTaskTitle('');
    setIsCreateOpen(false);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            board_id: boardId,
            owner_id: userData.user.id,
            title: optimisticTask.title,
            status: optimisticTask.status,
          },
        ])
        .select()
        .single();

      if (error) {
        showToast(error.message, 'error');
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      } else {
        showToast('Task added!', 'success');
        setTasks((prev) => prev.map((t) => (t.id === tempId ? data : t)));
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating task', 'error');
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCycleStatus = async (task: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const newStatus = nextStatus[task.status];

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) {
        showToast(error.message, 'error');
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating task', 'error');
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setEditError(undefined);

    const validation = taskSchema.safeParse({ title: editTitle, status: editStatus });
    if (!validation.success) {
      setEditError(validation.error.issues[0]?.message);
      return;
    }

    setIsUpdating(true);
    const updated = { ...editingTask, title: editTitle, status: editStatus };

    setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
    setEditingTask(null);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: editTitle, status: editStatus })
        .eq('id', editingTask.id);

      if (error) {
        showToast(error.message, 'error');
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? editingTask : t)));
      } else {
        showToast('Task updated', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating task', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const original = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        showToast(error.message, 'error');
        if (original) setTasks((prev) => [...prev, original]);
      } else {
        showToast('Task deleted', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting task', 'error');
      if (original) setTasks((prev) => [...prev, original]);
    }
  };

  const handleSaveSketch = (taskId: string, sketchUrl: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, sketch_url: sketchUrl } : t))
    );
  };

  const columns: Array<{ status: TaskStatus; label: string }> = [
    { status: 'todo', label: 'To Do' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'done', label: 'Done' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isLoading ? <Skeleton className="h-8 w-48" /> : board?.name || 'Board Details'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5" />
                {onlineUsers.length > 0
                  ? `${onlineUsers.length} user${onlineUsers.length > 1 ? 's' : ''} online now`
                  : '1 user online now'}
              </span>
            </div>
          </div>
        </div>

        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 min-h-[400px]"
              >
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={col.status} />
                    <span className="text-xs font-semibold text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setTaskStatus(col.status);
                      setIsCreateOpen(true);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {colTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                    <p className="text-xs text-slate-400">No tasks in {col.label}</p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setEditTitle(task.title);
                              setEditStatus(task.status);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Edit task"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.sketch_url && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white">
                          <Image
                            src={task.sketch_url}
                            alt="Attached sketch"
                            fill
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <StatusBadge
                          status={task.status}
                          onClick={() => handleCycleStatus(task)}
                        />
                        <button
                          onClick={() => setCanvasTask(task)}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          {task.sketch_url ? 'Edit Sketch' : 'Add Sketch'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Implement Supabase Realtime sync"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            error={createError}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Status
            </label>
            <select
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <Input
            label="Task Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            error={editError}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {canvasTask && (
        <CanvasModal
          isOpen={Boolean(canvasTask)}
          onClose={() => setCanvasTask(null)}
          task={canvasTask}
          onSaveSketch={handleSaveSketch}
        />
      )}
    </div>
  );
}
