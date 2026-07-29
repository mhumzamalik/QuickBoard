'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { supabase } from '@/lib/supabase';
import { Task } from '@quickboard/types';
import { Undo2, Trash2, Save, Paintbrush } from 'lucide-react';
import { logger } from '@/lib/logger';

interface CanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onSaveSketch: (taskId: string, sketchUrl: string) => void;
}

const COLORS = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const CanvasModal: React.FC<CanvasModalProps> = ({
  isOpen,
  onClose,
  task,
  onSaveSketch,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { showToast } = useToast();
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
          showToast('Failed to export canvas', 'error');
          setIsSaving(false);
          return;
        }

        const fileName = `sketch_${task.id}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sketches')
          .upload(fileName, blob, { contentType: 'image/png', upsert: true });

        if (uploadError) {
          logger.error('Upload error', uploadError);
          showToast(`Upload failed: ${uploadError.message}`, 'error');
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
          showToast(`Task update failed: ${updateError.message}`, 'error');
        } else {
          showToast('Sketch saved successfully!', 'success');
          onSaveSketch(task.id, publicUrl);
          onClose();
        }
        setIsSaving(false);
      }, 'image/png');
    } catch (err: any) {
      logger.error('Error saving sketch', err);
      showToast(err.message || 'Error saving sketch', 'error');
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sketch for "${task.title}"`} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Paintbrush className="w-3.5 h-3.5" /> Color:
            </span>
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-blue-500 shadow-sm' : 'border-slate-300 dark:border-slate-600'
                  }`}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Width:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-20 accent-blue-600"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 w-4">{lineWidth}px</span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={history.length <= 1}
                title="Undo stroke"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear} title="Clear canvas">
                <Trash2 className="w-4 h-4 text-rose-500" />
              </Button>
            </div>
          </div>
        </div>

        <div className="relative w-full border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner bg-white flex justify-center items-center">
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

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            <Save className="w-4 h-4" /> Save Sketch
          </Button>
        </div>
      </div>
    </Modal>
  );
};
