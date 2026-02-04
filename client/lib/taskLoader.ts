import { Task, TaskPool } from '@shared/tasks';

function getTasksUrl(): string {
  const base = import.meta.env.VITE_BASE_PATH ?? import.meta.env.BASE_URL ?? '/';

  // Build an absolute URL for tasks.json using the current origin when base is a path.
  try {
    const baseHref = base.startsWith('http') ? base : window.location.origin + (base.startsWith('/') ? base : `/${base}`);
    return new URL('tasks.json', baseHref).href;
  } catch {
    // Fallback: attempt a safe path join (works for typical `"/"` or `"/repo/"` base values)
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
    const withLeading = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `${withLeading}/tasks.json`;
  }
}

export async function loadTasks(): Promise<Task[]> {
  const tasksUrl = getTasksUrl();

  try {
    const response = await fetch(tasksUrl);
    if (!response.ok) {
      throw new Error('Failed to load tasks');
    }
    const data = await response.json();
    return data.Tasks || [];
  } catch (error) {
    console.error('Error loading tasks from', tasksUrl, error);
    return [];
  }
}

export function initializeTaskPool(tasks: Task[]): TaskPool {
  return {
    available: tasks.map(t => ({ ...t, status: 'available' as const })),
    assigned: [],
    completed: [],
  };
}

export function getTaskById(id: number, pool: TaskPool): Task | null {
  const allTasks = [...pool.available, ...pool.assigned, ...pool.completed];
  return allTasks.find(t => t.id === id) || null;
}

export function moveTaskToCompleted(
  taskId: number,
  pool: TaskPool
): TaskPool {
  const task = pool.assigned.find(t => t.id === taskId);
  if (!task) return pool;

  return {
    available: pool.available,
    assigned: pool.assigned.filter(t => t.id !== taskId),
    completed: [...pool.completed, { ...task, status: 'completed' }],
  };
}

export function moveTaskFromCompletedToAssigned(
  taskId: number,
  pool: TaskPool
): TaskPool {
  const task = pool.completed.find(t => t.id === taskId);
  if (!task) return pool;

  return {
    available: pool.available,
    assigned: [...pool.assigned, { ...task, status: 'assigned' }],
    completed: pool.completed.filter(t => t.id !== taskId),
  };
}