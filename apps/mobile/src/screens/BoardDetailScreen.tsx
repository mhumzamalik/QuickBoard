import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Task } from '@quickboard/types';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { TaskItem } from '../components/TaskItem';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardDetail'>;

export function BoardDetailScreen({ route, navigation }: Props) {
  const { boardId, boardName } = route.params;
  const { user } = useAuth();
  const { tasks, loading, error, createTask, deleteTask } = useTasks(boardId);

  // --- Add task state ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // --- Delete task state ---
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreateModal = () => {
    setTaskTitle('');
    setTitleError(null);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setTaskTitle('');
    setTitleError(null);
  };

  const handleCreateTask = async () => {
    const trimmed = taskTitle.trim();
    if (!trimmed) { setTitleError('Task title is required.'); return; }
    if (trimmed.length > 200) { setTitleError('Task title must be 200 characters or fewer.'); return; }
    if (!user) return;

    setIsCreating(true);
    setTitleError(null);
    const errMsg = await createTask(trimmed, boardId, user.id);
    setIsCreating(false);

    if (errMsg) {
      setTitleError(errMsg);
    } else {
      closeCreateModal();
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    const errMsg = await deleteTask(taskToDelete.id);
    setIsDeleting(false);
    if (errMsg) {
      setTaskToDelete(null);
      setDeleteError(errMsg);
      setTimeout(() => setDeleteError(null), 3000);
    } else {
      setTaskToDelete(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Boards</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{boardName}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {deleteError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{deleteError}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : tasks.length === 0 ? (
        <EmptyState message="No tasks yet — tap ＋ to add one" />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onPress={() =>
                navigation.navigate('TaskDetail', {
                  taskId: item.id,
                  boardId: item.board_id,
                  initialTitle: item.title,
                  initialStatus: item.status,
                  initialSketchUrl: item.sketch_url,
                })

              }
              onLongPress={() => setTaskToDelete(item)}
            />
          )}
        />
      )}

      {/* Add Task Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={isCreateOpen}
        onRequestClose={closeCreateModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Task</Text>
            <Text style={styles.fieldLabel}>Task Title</Text>
            <TextInput
              style={[styles.textInput, titleError ? styles.textInputError : null]}
              placeholder="e.g. Fix login bug"
              placeholderTextColor="#64748b"
              value={taskTitle}
              onChangeText={(t) => { setTaskTitle(t); setTitleError(null); }}
              autoFocus
              maxLength={200}
              returnKeyType="done"
              onSubmitEditing={handleCreateTask}
            />
            {titleError ? <Text style={styles.fieldError}>{titleError}</Text> : null}
            <Text style={styles.charCount}>{taskTitle.trim().length}/200</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeCreateModal}
                disabled={isCreating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateTask}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Task Confirm Dialog */}
      <ConfirmDialog
        visible={taskToDelete !== null}
        title="Delete Task"
        message={taskToDelete ? `Delete "${taskToDelete.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalSheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#ffffff',
  },
  textInputError: {
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
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 15,
  },
  createButton: {
    backgroundColor: '#2563eb',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
