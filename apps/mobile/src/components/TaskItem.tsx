import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Task } from '@quickboard/types';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
}

export function TaskItem({ task, onPress }: TaskItemProps) {
  return (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
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
          {task.status === 'in_progress' ? 'In Progress' : task.status.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
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
});
