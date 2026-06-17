export type AppVariant = 'default' | 'dad';

export const TASK_STORAGE_KEYS: Record<AppVariant, string> = {
  default: 'kawaii-todo-tasks',
  dad: 'kawaii-todo-tasks-dad',
};

/** True when pathname is `/dad` or `/dad/…`. */
export function getAppVariantFromPath(pathname: string): AppVariant {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/dad' || normalized.startsWith('/dad/')) {
    return 'dad';
  }
  return 'default';
}
