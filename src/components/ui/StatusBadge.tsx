import React from 'react';
import { TaskStatus } from '@quickboard/types';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
  onClick?: () => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', onClick }) => {
  const configs: Record<TaskStatus, { label: string; style: string }> = {
    todo: {
      label: 'To Do',
      style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    in_progress: {
      label: 'In Progress',
      style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    done: {
      label: 'Done',
      style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
  };

  const config = configs[status];

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      } ${config.style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {config.label}
    </span>
  );
};
