import { useEffect, useState, useCallback } from 'react';
import { Board } from '@quickboard/types';
import { supabase } from '../lib/supabase';

export function useBoards(userId: string | undefined) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    if (!userId) {
      setBoards([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('boards')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        setBoards(data || []);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch boards';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const createBoard = async (
    name: string,
    userId: string
  ): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return 'Board name is required.';
    if (trimmed.length > 80) return 'Board name must be 80 characters or fewer.';

    const tempId = `temp-${Date.now()}`;
    const tempBoard: Board = {
      id: tempId,
      owner_id: userId,
      name: trimmed,
      created_at: new Date().toISOString(),
    };

    // Optimistic insert
    setBoards((prev) => [tempBoard, ...prev]);

    try {
      const { data, error: err } = await supabase
        .from('boards')
        .insert({ owner_id: userId, name: trimmed })
        .select()
        .single();

      if (err) {
        setBoards((prev) => prev.filter((b) => b.id !== tempId));
        return err.message;
      }

      setBoards((prev) =>
        prev.map((b) => (b.id === tempId ? (data as Board) : b))
      );
      return null;
    } catch (e: unknown) {
      setBoards((prev) => prev.filter((b) => b.id !== tempId));
      return e instanceof Error ? e.message : 'Failed to create board.';
    }
  };

  // No realtime subscription for boards — use optimistic removal with fetchBoards rollback.
  const deleteBoard = async (boardId: string): Promise<string | null> => {
    setBoards((prev) => prev.filter((b) => b.id !== boardId));

    try {
      const { error: err } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (err) {
        fetchBoards(); // Restore list
        return err.message;
      }
      return null;
    } catch (e: unknown) {
      fetchBoards();
      return e instanceof Error ? e.message : 'Failed to delete board.';
    }
  };

  return {
    boards,
    loading,
    error,
    refetch: fetchBoards,
    setBoards,
    createBoard,
    deleteBoard,
  };
}
