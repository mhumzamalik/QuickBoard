import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Task } from '@quickboard/types';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onLongPress?: () => void;
}

export function TaskItem({ task, onPress, onLongPress }: TaskItemProps) {
  return (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View
            style={[
              styles.statusBadge,
              task.status === 'done'
                ? styles.statusDone
                : task.status === 'in_progress'
                ? styles.statusInProgress
                : styles.statusTodo,
            ]}
          >
            <Text style={styles.statusText}>
              {task.status === 'in_progress'
                ? 'In Progress'
                : task.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {task.sketch_url ? (
          <View style={styles.sketchPreviewContainer}>
            <Image
              source={{ uri: task.sketch_url }}
              style={styles.sketchThumbnail}
              resizeMode="cover"
            />
            <Text style={styles.sketchLabel}>🎨 Has Sketch</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardContent: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f8fafc',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTodo: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusInProgress: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  statusDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  sketchPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  sketchThumbnail: {
    width: 48,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  sketchLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
