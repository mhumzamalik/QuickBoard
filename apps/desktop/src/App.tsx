import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import { Board, Task, TaskStatus } from '@quickboard/types';
import { Session } from '@supabase/supabase-js';
import {
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  LogOut,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Edit2,
  Palette,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SketchModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSaveSketch: (taskId: string, sketchUrl: string) => void;
  onSaveError: (msg: string) => void;
}

const SKETCH_COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
];

function SketchModal({ task, isOpen, onClose, onSaveSketch, onSaveError }: SketchModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHistory([]);

      if (task.sketch_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          saveState();
        };
        img.src = task.sketch_url;
      } else {
        saveState();
      }
    }
  }, [isOpen, task.sketch_url]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, data]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !previousState) return;
    ctx.putImageData(previousState, 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          onSaveError('Failed to export canvas');
          setIsSaving(false);
          return;
        }

        const fileName = `sketch_${task.id}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sketches')
          .upload(fileName, blob, { contentType: 'image/png', upsert: true });

        if (uploadError) {
          onSaveError(`Upload failed: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('sketches')
          .getPublicUrl(uploadData.path);

        const publicUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase
          .from('tasks')
          .update({ sketch_url: publicUrl })
          .eq('id', task.id);

        if (updateError) {
          onSaveError(`Task update failed: ${updateError.message}`);
        } else {
          onSaveSketch(task.id, publicUrl);
          onClose();
        }
        setIsSaving(false);
      }, 'image/png');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving sketch';
      onSaveError(msg);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-lg text-white">Sketch for &quot;{task.title}&quot;</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" disabled={isSaving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              Color:
            </span>
            <div className="flex items-center gap-1.5">
              {SKETCH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-blue-500 shadow-sm' : 'border-slate-700'
                  }`}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Width:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-20 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs text-slate-400 w-6">{lineWidth}px</span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
                title="Undo stroke"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                title="Clear canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative w-full border border-slate-800 rounded-xl overflow-hidden shadow-inner bg-white flex justify-center items-center">
          <canvas
            ref={canvasRef}
            width={580}
            height={340}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair touch-none bg-white"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-md shadow-blue-600/20"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Sketch</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [appError, setAppError] = useState<string | null>(null);

  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [sketchTask, setSketchTask] = useState<Task | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) fetchBoards(data.session.user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) fetchBoards(newSession.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchBoards = async (userId: string) => {
    setBoardsLoading(true);
    setAppError(null);
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    setBoardsLoading(false);
    if (error) {
      setAppError("Couldn't load boards. Please check your connection and try again.");
    } else {
      setBoards(data || []);
    }
  };

  const fetchTasks = async (boardId: string) => {
    setTasksLoading(true);
    setAppError(null);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    setTasksLoading(false);
    if (error) {
      setAppError("Couldn't load tasks. Please check your connection and try again.");
    } else {
      setTasks(data || []);
    }
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

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateSignUp = (): boolean => {
    let valid = true;
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFullNameError('Full Name is required.');
      valid = false;
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      setFullNameError('Full Name must be between 2 and 100 characters.');
      valid = false;
    } else {
      setFullNameError(null);
    }
    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    } else {
      setEmailError(null);
    }
    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    } else {
      setPasswordError(null);
    }
    if (!confirmPassword) {
      setConfirmError('Please confirm your password.');
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmError('Passwords do not match.');
      valid = false;
    } else {
      setConfirmError(null);
    }
    return valid;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      setServerError(null);
      if (!validateSignUp()) return;

      setAuthLoading(true);
      try {
        const trimmedName = fullName.trim();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: trimmedName, full_name: trimmedName } },
        });
        if (error) {
          setServerError(error.message);
          return;
        }
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: trimmedName,
          });
        }
        if (!data.session) {
          setAwaitingConfirmation(true);
        }
      } catch (err: unknown) {
        setServerError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
      } finally {
        setAuthLoading(false);
      }
    } else {
      setAuthError('');
      setAuthSuccess('');
      setAuthLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthError(error.message);
        }
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newBoardName.trim()) return;

    setAppError(null);
    const { error } = await supabase
      .from('boards')
      .insert({ name: newBoardName.trim(), owner_id: session.user.id });

    if (error) {
      setAppError('Failed to create board. Please try again.');
    } else {
      setNewBoardName('');
      setShowCreateBoard(false);
      fetchBoards(session.user.id);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedBoard || !newTaskTitle.trim()) return;

    setAppError(null);
    const { error } = await supabase.from('tasks').insert({
      title: newTaskTitle.trim(),
      board_id: selectedBoard.id,
      owner_id: session.user.id,
      status: 'todo',
    });

    if (error) {
      setAppError('Failed to create task. Please try again.');
    } else {
      setNewTaskTitle('');
      setShowCreateTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    setAppError(null);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      setAppError('Failed to delete task. Please try again.');
    }
  };

  const handleStartEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveTaskTitle = async (task: Task) => {
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === task.title) {
      setEditingTaskId(null);
      return;
    }

    setEditingTaskId(null);
    setAppError(null);
    const { error } = await supabase
      .from('tasks')
      .update({ title: trimmed })
      .eq('id', task.id);

    if (error) {
      setAppError('Failed to update task title.');
      if (selectedBoard) fetchTasks(selectedBoard.id);
    }
  };

  const handleCycleStatus = async (task: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const newStatus = nextStatus[task.status];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (error) {
      setAppError('Failed to update task status.');
      if (selectedBoard) fetchTasks(selectedBoard.id);
    }
  };

  const handleSaveSketchSuccess = (taskId: string, sketchUrl: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, sketch_url: sketchUrl } : t))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    if (awaitingConfirmation) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-10 space-y-6 shadow-2xl text-center">
            <div className="text-5xl">✉️</div>
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-blue-400">{email.trim()}</span>.
              <br />
              Open it to activate your account, then sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setAwaitingConfirmation(false);
                setIsSignUp(false);
                setFullName('');
                setPassword('');
                setConfirmPassword('');
                setServerError(null);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl my-8">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-500 mb-2">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isSignUp ? 'Create your QuickBoard account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-slate-400">
              {isSignUp
                ? 'Start organizing your tasks and ideas seamlessly'
                : 'Sign in to your account to continue'}
            </p>
          </div>

          {isSignUp && serverError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <p className="text-xs text-rose-400 text-center font-medium">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setFullNameError(null); }}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none transition-colors ${
                    fullNameError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                {fullNameError && (
                  <p className="text-xs text-rose-400 mt-1">{fullNameError}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none transition-colors ${
                  isSignUp && emailError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              {isSignUp && emailError && (
                <p className="text-xs text-rose-400 mt-1">{emailError}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignUp ? 'Min. 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                  className={`w-full px-3.5 py-2.5 pr-10 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none transition-colors ${
                    isSignUp && passwordError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp && passwordError && (
                <p className="text-xs text-rose-400 mt-1">{passwordError}</p>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null); }}
                    className={`w-full px-3.5 py-2.5 pr-10 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none transition-colors ${
                      confirmError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmError && (
                  <p className="text-xs text-rose-400 mt-1">{confirmError}</p>
                )}
              </div>
            )}

            {!isSignUp && authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <p className="text-xs text-rose-400 text-center font-medium">{authError}</p>
              </div>
            )}
            {!isSignUp && authSuccess && (
              <p className="text-xs text-emerald-400 font-medium text-center">{authSuccess}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20 mt-2"
            >
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 border-t border-slate-800 pt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError('');
                setAuthSuccess('');
                setServerError(null);
                setFullNameError(null);
                setEmailError(null);
                setPasswordError(null);
                setConfirmError(null);
                setFullName('');
                setPassword('');
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className="font-semibold text-blue-500 hover:text-blue-400 transition-colors hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
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

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {appError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-300 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{appError}</span>
            </div>
            <button
              onClick={() => setAppError(null)}
              className="p-1 text-rose-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {selectedBoard ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedBoard(null)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-white">{selectedBoard.name}</h1>
              </div>

              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>

            {showCreateTask && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white">Create New Task</h3>
                    <button
                      onClick={() => setShowCreateTask(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                      autoFocus
                      required
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateTask(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl"
                      >
                        Create Task
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {sketchTask && (
              <SketchModal
                task={sketchTask}
                isOpen={!!sketchTask}
                onClose={() => setSketchTask(null)}
                onSaveSketch={handleSaveSketchSuccess}
                onSaveError={(msg) => setAppError(msg)}
              />
            )}

            {tasksLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading tasks...</span>
              </div>
            ) : (
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
                            className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col gap-3 shadow-sm group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleCycleStatus(t)}
                                  className="mt-0.5 shrink-0"
                                >
                                  {t.status === 'done' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : t.status === 'in_progress' ? (
                                    <Clock className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-amber-400" />
                                  )}
                                </button>

                                {editingTaskId === t.id ? (
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <input
                                      type="text"
                                      value={editingTitle}
                                      onChange={(e) => setEditingTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveTaskTitle(t);
                                        if (e.key === 'Escape') setEditingTaskId(null);
                                      }}
                                      onBlur={() => handleSaveTaskTitle(t)}
                                      className="w-full px-2 py-1 bg-slate-950 border border-blue-500 rounded text-sm text-white focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSaveTaskTitle(t)}
                                      className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => setEditingTaskId(null)}
                                      className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    onDoubleClick={() => handleStartEditTask(t)}
                                    className={`text-sm font-medium break-words cursor-pointer flex-1 ${
                                      t.status === 'done'
                                        ? 'line-through text-slate-500'
                                        : 'text-slate-200'
                                    }`}
                                    title="Double click to edit title"
                                  >
                                    {t.title}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => handleStartEditTask(t)}
                                  className="text-slate-500 hover:text-blue-400 p-1 rounded transition-colors"
                                  title="Edit Title"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSketchTask(t)}
                                  className="text-slate-500 hover:text-purple-400 p-1 rounded transition-colors"
                                  title={t.sketch_url ? 'Edit Sketch' : 'Add Sketch'}
                                >
                                  <Palette className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {t.sketch_url && (
                              <div
                                onClick={() => setSketchTask(t)}
                                className="mt-1 cursor-pointer border border-slate-800 rounded-lg overflow-hidden bg-slate-950 p-2 flex items-center justify-center hover:border-purple-500/40 transition-colors min-h-[90px]"
                              >
                                <img
                                  src={t.sketch_url}
                                  alt="Attached sketch"
                                  className="max-h-[120px] w-auto object-contain rounded"
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Your Boards</h1>
              <button
                onClick={() => setShowCreateBoard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>New Board</span>
              </button>
            </div>

            {showCreateBoard && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white">Create New Board</h3>
                    <button
                      onClick={() => setShowCreateBoard(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateBoard} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Board name..."
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                      autoFocus
                      required
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateBoard(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl"
                      >
                        Create Board
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {boardsLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading boards...</span>
              </div>
            ) : boards.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
                No boards found. Click &quot;New Board&quot; to create one.
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
