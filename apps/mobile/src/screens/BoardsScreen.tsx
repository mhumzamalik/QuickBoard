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
import { Board } from '@quickboard/types';
import { useAuth } from '../hooks/useAuth';
import { useBoards } from '../hooks/useBoards';
import { BoardCard } from '../components/BoardCard';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Boards'>;

export function BoardsScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { boards, loading, error, createBoard, deleteBoard } = useBoards(user?.id);

  // --- Create board state ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Delete board state ---
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreateModal = () => {
    setBoardName('');
    setNameError(null);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setBoardName('');
    setNameError(null);
  };

  const handleCreateBoard = async () => {
    const trimmed = boardName.trim();
    if (!trimmed) { setNameError('Board name is required.'); return; }
    if (trimmed.length > 80) { setNameError('Board name must be 80 characters or fewer.'); return; }
    if (!user) return;

    setIsCreating(true);
    setNameError(null);
    const errMsg = await createBoard(trimmed, user.id);
    setIsCreating(false);

    if (errMsg) {
      setNameError(errMsg);
    } else {
      closeCreateModal();
      setSuccessMsg('Board created!');
      setTimeout(() => setSuccessMsg(null), 2500);
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    const errMsg = await deleteBoard(boardToDelete.id);
    setIsDeleting(false);
    if (errMsg) {
      setBoardToDelete(null);
      setDeleteError(errMsg);
      setTimeout(() => setDeleteError(null), 3000);
    } else {
      setBoardToDelete(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Boards</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Text style={styles.addButtonText}>＋</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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

      {successMsg ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMsg}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : boards.length === 0 ? (
        <EmptyState message="No boards yet — tap ＋ to create one" />
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <BoardCard
              board={item}
              onPress={() =>
                navigation.navigate('BoardDetail', {
                  boardId: item.id,
                  boardName: item.name,
                })
              }
              onLongPress={() => setBoardToDelete(item)}
            />
          )}
        />
      )}

      {/* Create Board Modal */}
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
            <Text style={styles.modalTitle}>New Board</Text>
            <Text style={styles.fieldLabel}>Board Name</Text>
            <TextInput
              style={[styles.textInput, nameError ? styles.textInputError : null]}
              placeholder="e.g. Sprint Planning"
              placeholderTextColor="#64748b"
              value={boardName}
              onChangeText={(t) => { setBoardName(t); setNameError(null); }}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleCreateBoard}
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
            <Text style={styles.charCount}>{boardName.trim().length}/80</Text>
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
                onPress={handleCreateBoard}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Board Confirm Dialog */}
      <ConfirmDialog
        visible={boardToDelete !== null}
        title="Delete Board"
        message={boardToDelete ? `Delete "${boardToDelete.name}"? This will also delete all its tasks and cannot be undone.` : ''}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteBoard}
        onCancel={() => setBoardToDelete(null)}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 14,
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
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  successBannerText: {
    color: '#6ee7b7',
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
