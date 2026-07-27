import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Task, TaskStatus } from '@quickboard/types';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/RootNavigator';
import { SketchBoardModal } from '../components/SketchBoardModal';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId, boardId, initialTitle, initialStatus, initialSketchUrl } =
    route.params;

  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [sketchUrl, setSketchUrl] = useState<string | null>(
    initialSketchUrl || null
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Sketch modal control
  const [isSketchModalOpen, setIsSketchModalOpen] = useState(false);
  const [isClearingSketch, setIsClearingSketch] = useState(false);

  const taskForSketch: Task = {
    id: taskId,
    board_id: boardId,
    owner_id: '',
    title: title,
    status: status,
    sketch_url: sketchUrl,
    created_at: '',
    updated_at: '',
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Task title is required.');
      return;
    }
    if (trimmed.length > 200) {
      setTitleError('Task title must be 200 characters or fewer.');
      return;
    }

    setSaving(true);
    setTitleError(null);
    setServerError(null);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: trimmed, status, sketch_url: sketchUrl })
        .eq('id', taskId);

      if (error) {
        setServerError(error.message);
        return;
      }

      navigation.goBack();
    } catch (e: unknown) {
      setServerError(
        e instanceof Error ? e.message : 'Failed to save task. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSketch = async () => {
    setIsClearingSketch(true);
    setServerError(null);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ sketch_url: null })
        .eq('id', taskId);

      if (error) {
        setServerError(error.message);
      } else {
        setSketchUrl(null);
      }
    } catch (e: unknown) {
      setServerError(
        e instanceof Error ? e.message : 'Failed to remove sketch.'
      );
    } finally {
      setIsClearingSketch(false);
    }
  };

  const hasChanges =
    title.trim() !== initialTitle ||
    status !== initialStatus ||
    sketchUrl !== (initialSketchUrl || null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Board</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Task</Text>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {serverError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        ) : null}

        {/* Title field */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            style={[styles.input, titleError ? styles.inputError : null]}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setTitleError(null);
            }}
            placeholder="Task title"
            placeholderTextColor="#64748b"
            maxLength={200}
            multiline
            returnKeyType="done"
          />
          {titleError ? (
            <Text style={styles.fieldError}>{titleError}</Text>
          ) : null}
          <Text style={styles.charCount}>{title.trim().length}/200</Text>
        </View>

        {/* Status segmented control */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Status</Text>
          <View style={styles.segmentedControl}>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.segment,
                  status === value &&
                    (value === 'done'
                      ? styles.segmentDone
                      : value === 'in_progress'
                      ? styles.segmentInProgress
                      : styles.segmentTodo),
                ]}
                onPress={() => setStatus(value)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.segmentText,
                    status === value && styles.segmentTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sketch / Canvas Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sketch Board / Whiteboard</Text>

          {sketchUrl ? (
            <View style={styles.sketchContainer}>
              <Image
                source={{ uri: sketchUrl }}
                style={styles.sketchImage}
                resizeMode="contain"
              />
              <View style={styles.sketchActions}>
                <TouchableOpacity
                  style={styles.sketchEditBtn}
                  onPress={() => setIsSketchModalOpen(true)}
                >
                  <Text style={styles.sketchEditBtnText}>✏️ Edit Sketch</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sketchDeleteBtn}
                  onPress={handleRemoveSketch}
                  disabled={isClearingSketch}
                >
                  {isClearingSketch ? (
                    <ActivityIndicator color="#ef4444" size="small" />
                  ) : (
                    <Text style={styles.sketchDeleteBtnText}>🗑 Remove</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sketchAddBox}
              onPress={() => setIsSketchModalOpen(true)}
            >
              <Text style={styles.sketchAddIcon}>🎨</Text>
              <Text style={styles.sketchAddTitle}>Open Sketch Board</Text>
              <Text style={styles.sketchAddSubtitle}>
                Draw a diagram or sketch for this task
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Sketch Modal */}
      <SketchBoardModal
        visible={isSketchModalOpen}
        task={taskForSketch}
        onClose={() => setIsSketchModalOpen(false)}
        onSaved={(newSketchUrl) => {
          setSketchUrl(newSketchUrl);
        }}
      />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 56,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldError: {
    color: '#fca5a5',
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTodo: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  segmentInProgress: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  segmentDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // Sketch section
  sketchContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  sketchImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  sketchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sketchEditBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  sketchEditBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  sketchDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  sketchDeleteBtnText: {
    color: '#fca5a5',
    fontWeight: '600',
    fontSize: 13,
  },
  sketchAddBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sketchAddIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  sketchAddTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  sketchAddSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
});
