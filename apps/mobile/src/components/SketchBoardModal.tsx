import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Task } from '@quickboard/types';
import { toByteArray } from 'base64-js';
import { supabase } from '../lib/supabase';

interface SketchBoardModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSaved?: (sketchUrl: string) => void;
}

const COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
];

const LINE_WIDTHS = [2, 4, 8, 12, 16];

export function SketchBoardModal({
  visible,
  task,
  onClose,
  onSaved,
}: SketchBoardModalProps) {
  const webViewRef = useRef<any>(null);

  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [selectedLineWidth, setSelectedLineWidth] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!task) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          * {
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #0f172a;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          canvas {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            cursor: crosshair;
          }
        </style>
      </head>
      <body>
        <canvas id="sketchCanvas"></canvas>
        <script>
          const canvas = document.getElementById('sketchCanvas');
          const ctx = canvas.getContext('2d');
          
          let currentColor = '${selectedColor}';
          let currentLineWidth = ${selectedLineWidth};
          let isDrawing = false;
          let history = [];

          function resizeCanvas() {
            const width = Math.min(window.innerWidth - 16, 800);
            const height = Math.min(window.innerHeight - 16, 600);
            canvas.width = width;
            canvas.height = height;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            ${
              task.sketch_url
                ? `
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function() {
                  ctx.drawImage(img, 0, 0, width, height);
                  saveState();
                };
                img.src = "${task.sketch_url}";
              `
                : `saveState();`
            }
          }

          function saveState() {
            try {
              const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
              history.push(data);
            } catch (e) {}
          }

          function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
              x: clientX - rect.left,
              y: clientY - rect.top
            };
          }

          function startDrawing(e) {
            e.preventDefault();
            isDrawing = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
          }

          function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const pos = getPos(e);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentLineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
          }

          function stopDrawing(e) {
            if (isDrawing) {
              isDrawing = false;
              saveState();
            }
          }

          canvas.addEventListener('mousedown', startDrawing);
          canvas.addEventListener('mousemove', draw);
          canvas.addEventListener('mouseup', stopDrawing);
          canvas.addEventListener('mouseleave', stopDrawing);

          canvas.addEventListener('touchstart', startDrawing, { passive: false });
          canvas.addEventListener('touchmove', draw, { passive: false });
          canvas.addEventListener('touchend', stopDrawing, { passive: false });

          // Message handling from React Native
          document.addEventListener('message', handleMessage);
          window.addEventListener('message', handleMessage);

          function handleMessage(event) {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'SET_COLOR') {
                currentColor = msg.color;
              } else if (msg.type === 'SET_LINE_WIDTH') {
                currentLineWidth = msg.width;
              } else if (msg.type === 'UNDO') {
                if (history.length > 1) {
                  history.pop();
                  const prev = history[history.length - 1];
                  ctx.putImageData(prev, 0, 0);
                }
              } else if (msg.type === 'CLEAR') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                saveState();
              } else if (msg.type === 'EXPORT') {
                const dataUrl = canvas.toDataURL('image/png');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'EXPORT_RESULT',
                  dataUrl: dataUrl
                }));
              }
            } catch (err) {}
          }

          window.onload = resizeCanvas;
        </script>
      </body>
    </html>
  `;

  const sendWebMessage = (data: object) => {
    webViewRef.current?.postMessage(JSON.stringify(data));
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    sendWebMessage({ type: 'SET_COLOR', color });
  };

  const handleSelectLineWidth = (width: number) => {
    setSelectedLineWidth(width);
    sendWebMessage({ type: 'SET_LINE_WIDTH', width });
  };

  const handleUndo = () => {
    sendWebMessage({ type: 'UNDO' });
  };

  const handleClear = () => {
    sendWebMessage({ type: 'CLEAR' });
  };

  const handleTriggerSave = () => {
    setIsSaving(true);
    setErrorMsg(null);
    sendWebMessage({ type: 'EXPORT' });
  };

  const handleWebMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'EXPORT_RESULT' && msg.dataUrl) {
        const base64Data = msg.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const byteArray = toByteArray(base64Data);

        const fileName = `sketch_${task.id}_${Date.now()}.png`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('sketches')
          .upload(fileName, byteArray, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadErr) {
          setErrorMsg(`Upload failed: ${uploadErr.message}`);
          setIsSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('sketches')
          .getPublicUrl(uploadData.path);

        const publicUrl = publicUrlData.publicUrl;

        const { error: updateErr } = await supabase
          .from('tasks')
          .update({ sketch_url: publicUrl })
          .eq('id', task.id);

        if (updateErr) {
          setErrorMsg(`Task update failed: ${updateErr.message}`);
          setIsSaving(false);
          return;
        }

        setIsSaving(false);
        if (onSaved) onSaved(publicUrl);
        onClose();
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Error saving sketch.');
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            Sketch: {task.title}
          </Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleTriggerSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Controls Toolbar */}
        <View style={styles.toolbar}>
          {/* Colors */}
          <View style={styles.colorsRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorSwatchSelected,
                ]}
                onPress={() => handleSelectColor(c)}
              />
            ))}
          </View>

          {/* Stroke Widths & Actions */}
          <View style={styles.actionsRow}>
            <View style={styles.lineWidthGroup}>
              {LINE_WIDTHS.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[
                    styles.widthBtn,
                    selectedLineWidth === w && styles.widthBtnSelected,
                  ]}
                  onPress={() => handleSelectLineWidth(w)}
                >
                  <Text
                    style={[
                      styles.widthBtnText,
                      selectedLineWidth === w && styles.widthBtnTextSelected,
                    ]}
                  >
                    {w}px
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.btnGroup}>
              <TouchableOpacity style={styles.toolBtn} onPress={handleUndo}>
                <Text style={styles.toolBtnText}>↩ Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolBtn, styles.clearBtn]}
                onPress={handleClear}
              >
                <Text style={styles.clearBtnText}>🗑 Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Drawing Area */}
        <View style={styles.canvasContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webView}
            scrollEnabled={false}
            onMessage={handleWebMessage}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  saveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    padding: 10,
    margin: 12,
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  toolbar: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  colorsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#475569',
  },
  colorSwatchSelected: {
    borderColor: '#3b82f6',
    transform: [{ scale: 1.15 }],
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineWidthGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  widthBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  widthBtnSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  widthBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  widthBtnTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  toolBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  clearBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  clearBtnText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 8,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
});
