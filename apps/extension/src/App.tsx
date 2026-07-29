import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Task, Board, TaskStatus } from '@quickboard/types';
import { LayoutGrid, Plus, CheckCircle2, Circle, Clock, LogOut } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchData(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setLoading(true);
    const { data: bData } = await supabase
      .from('boards')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (bData && bData.length > 0) {
      setBoards(bData);
      setSelectedBoardId(bData[0].id);
    }

    const { data: tData } = await supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    setTasks(tData || []);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    } else if (data.session) {
      setSession(data.session);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedBoardId || !session) return;

    setIsAdding(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          board_id: selectedBoardId,
          owner_id: session.user.id,
          title: newTaskTitle,
          status: 'todo',
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => [data, ...prev.slice(0, 4)]);
      setNewTaskTitle('');
    }
    setIsAdding(false);
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
      <div className="w-80 h-96 flex items-center justify-center bg-slate-900 text-white">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-80 p-5 bg-slate-900 text-white space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-500" />
          <h2 className="font-bold text-base">QuickBoard Sign In</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
          {authError && <p className="text-xs text-rose-400 font-medium">{authError}</p>}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-80 p-4 bg-slate-900 text-white space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-sm">QuickBoard</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleAddTask} className="space-y-2">
        {boards.length > 0 && (
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Add task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isAdding}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Recent Tasks</span>
          <span>{tasks.length} total</span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
            No tasks found.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleCycleStatus(task)}
                className="flex items-center justify-between p-2 bg-slate-800/80 border border-slate-800 rounded-lg hover:border-slate-700 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  {task.status === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : task.status === 'in_progress' ? (
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span
                    className={`text-xs truncate ${
                      task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 shrink-0">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
