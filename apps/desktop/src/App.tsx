import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Board, Task, TaskStatus } from '@quickboard/types';
import { LayoutGrid, ArrowLeft, LogOut, CheckCircle2, Circle, Clock } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Data state
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) fetchBoards(data.session.user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchBoards(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchBoards = async (userId: string) => {
    const { data } = await supabase
      .from('boards')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    setBoards(data || []);
  };

  const fetchTasks = async (boardId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    setTasks(data || []);
  };

  useEffect(() => {
    if (!selectedBoard) return;
    fetchTasks(selectedBoard.id);

    const channel = supabase
      .channel(`realtime:desktop:${selectedBoard.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${selectedBoard.id}`,
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
      supabase.removeChannel(channel);
    };
  }, [selectedBoard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };

  const handleCycleStatus = async (task: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const newStatus = nextStatus[task.status];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-500 mb-2">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white">QuickBoard Desktop</h1>
            <p className="text-xs text-slate-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {authError && <p className="text-xs text-rose-400 font-medium">{authError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">QuickBoard Desktop</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-slate-400">{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {selectedBoard ? (
          /* Board Task View */
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBoard(null)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-white">{selectedBoard.name}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => {
                const statusTasks = tasks.filter((t) => t.status === status);
                const labels: Record<TaskStatus, string> = {
                  todo: 'To Do',
                  in_progress: 'In Progress',
                  done: 'Done',
                };
                return (
                  <div
                    key={status}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 min-h-[350px]"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {labels[status]}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{statusTasks.length}</span>
                    </div>

                    {statusTasks.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                        No tasks
                      </div>
                    ) : (
                      statusTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleCycleStatus(t)}
                          className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 cursor-pointer transition-all flex items-start gap-3 shadow-sm"
                        >
                          {t.status === 'done' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : t.status === 'in_progress' ? (
                            <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`text-sm font-medium ${
                              t.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Boards List View */
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Your Boards</h1>

            {boards.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
                No boards found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBoard(b)}
                    className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 cursor-pointer transition-all space-y-4 group"
                  >
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 w-fit">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                        {b.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Created {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
