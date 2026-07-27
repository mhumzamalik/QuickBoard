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

  return {
    boards,
    loading,
    error,
    refetch: fetchBoards,
    setBoards,
  };
}
