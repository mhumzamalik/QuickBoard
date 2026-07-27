'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Board } from '@quickboard/types';
import { boardSchema, BoardFormData } from '@/lib/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Plus, LayoutGrid, Trash2, Edit2, ArrowRight, FolderPlus } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editBoardName, setEditBoardName] = useState('');
  const [editError, setEditError] = useState<string | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching boards:', error);
        showToast(error.message, 'error');
      } else {
        setBoards(data || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading boards', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(undefined);

    const validation = boardSchema.safeParse({ name: newBoardName });
    if (!validation.success) {
      setCreateError(validation.error.issues[0]?.message);
      return;
    }

    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('boards')
        .insert([{ name: newBoardName, owner_id: userData.user.id }])
        .select()
        .single();

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Board created successfully!', 'success');
        setBoards((prev) => [data, ...prev]);
        setNewBoardName('');
        setIsCreateOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create board', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoard) return;
    setEditError(undefined);

    const validation = boardSchema.safeParse({ name: editBoardName });
    if (!validation.success) {
      setEditError(validation.error.issues[0]?.message);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('boards')
        .update({ name: editBoardName })
        .eq('id', editingBoard.id);

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Board renamed!', 'success');
        setBoards((prev) =>
          prev.map((b) => (b.id === editingBoard.id ? { ...b, name: editBoardName } : b))
        );
        setEditingBoard(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to rename board', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete board "${name}"? All attached tasks will be removed.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('boards').delete().eq('id', boardId);

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Board deleted', 'info');
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete board', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Your Boards
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize tasks, collaborate in real time, and sketch ideas
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Create New Board
        </Button>
      </div>

      {/* Board list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : boards.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 my-12 space-y-4">
          <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600">
            <FolderPlus className="w-10 h-10" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No boards yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create your first task board to get started with QuickBoard.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Create Board Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <div
              key={board.id}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingBoard(board);
                        setEditBoardName(board.name);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Rename board"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBoard(board.id, board.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Delete board"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link href={`/board/${board.id}`} className="block group-hover:text-blue-600 transition-colors">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">
                    {board.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Created {new Date(board.created_at).toLocaleDateString()}
                  </p>
                </Link>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Open Board
                </span>
                <Link
                  href={`/board/${board.id}`}
                  className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Board">
        <form onSubmit={handleCreateBoard} className="space-y-4">
          <Input
            label="Board Name"
            placeholder="e.g. Sprint Goals, Personal Notes"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            error={createError}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Create Board
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Board Modal */}
      <Modal
        isOpen={Boolean(editingBoard)}
        onClose={() => setEditingBoard(null)}
        title="Rename Board"
      >
        <form onSubmit={handleUpdateBoard} className="space-y-4">
          <Input
            label="Board Name"
            placeholder="e.g. Sprint Goals"
            value={editBoardName}
            onChange={(e) => setEditBoardName(e.target.value)}
            error={editError}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingBoard(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Name
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
