export const logger = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[QuickBoard INFO]:', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[QuickBoard ERROR]:', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[QuickBoard WARN]:', ...args);
  },
};
