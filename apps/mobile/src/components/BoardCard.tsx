import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Board } from '@quickboard/types';

interface BoardCardProps {
  board: Board;
  onPress: () => void;
  onLongPress?: () => void;
}


export function BoardCard({ board, onPress, onLongPress }: BoardCardProps) {
  return (
    <TouchableOpacity
      style={styles.boardCard}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <Text style={styles.boardName}>{board.name}</Text>
      <Text style={styles.boardDate}>
        Created {new Date(board.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boardCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  boardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  boardDate: {
    fontSize: 12,
    color: '#64748b',
  },
});
