import { Task, TaskPool, WeekSchedule } from '@shared/tasks';

export interface DayTaskAssignment {
  day: string;
  tasks: Task[];
  hoursUsed: number;
}

export interface EnhancedWeekSchedule extends WeekSchedule {
  dayAssignments: DayTaskAssignment[];
}

/**
 * Greedy scheduling algorithm that assigns tasks to days sequentially
 * Once a day hits capacity, no more tasks are added to it.
 * If a task doesn't fit in any remaining unfilled day in a week, it moves to the next week.
 */
export function greedyScheduleTasks(
  taskPool: TaskPool,
  selectedDays: string[],
  dailyHours: Record<string, number>,
  startFromWeek: number = 1
): EnhancedWeekSchedule[] {
  const weeks: EnhancedWeekSchedule[] = [];

  // Start with assigned tasks (lower IDs), then available tasks
  const tasksToSchedule = [...taskPool.assigned, ...taskPool.available];

  let currentTaskIndex = 0;
  let weekNumber = startFromWeek;

  while (currentTaskIndex < tasksToSchedule.length) {
    const dayAssignments: DayTaskAssignment[] = selectedDays.map(day => ({
      day,
      tasks: [],
      hoursUsed: 0,
    }));

    const maxHours = dailyHours;
    const fullDays = new Set<string>(); // Track which days are at capacity
    let weekHasContent = false;

    // Try to fit tasks into this week
    while (currentTaskIndex < tasksToSchedule.length) {
      const currentTask = tasksToSchedule[currentTaskIndex];
      let placed = false;

      // Try to place task in first available non-full day
      for (const assignment of dayAssignments) {
        // Skip days that are already at capacity
        if (fullDays.has(assignment.day)) {
          continue;
        }

        const dayMax = maxHours[assignment.day] || 0;
        if (assignment.hoursUsed + currentTask.weight <= dayMax) {
          assignment.tasks.push({
            ...currentTask,
            status: 'assigned'
          });
          assignment.hoursUsed += currentTask.weight;

          // If this task fills the day to capacity, mark it as full
          if (assignment.hoursUsed === dayMax) {
            fullDays.add(assignment.day);
          }

          currentTaskIndex++;
          placed = true;
          weekHasContent = true;
          break;
        } else {
          // Day can't fit this task, so mark it as full
          fullDays.add(assignment.day);
        }
      }

      // If not placed, move to next week
      if (!placed) {
        break;
      }
    }

    // Only create week if it has content
    if (weekHasContent) {
      const allWeekTasks = dayAssignments.flatMap(a => a.tasks);
      weeks.push({
        weekNumber,
        days: selectedDays,
        hours: { ...dailyHours },
        tasks: allWeekTasks,
        dayAssignments,
      });
      weekNumber++;
    } else if (currentTaskIndex < tasksToSchedule.length) {
      // If we have unplaced tasks but can't fit them, move to next week anyway
      // This handles edge cases where a single task exceeds daily hour limit
      const currentTask = tasksToSchedule[currentTaskIndex];
      const largestDay = selectedDays.reduce((prev, current) =>
        (maxHours[current] || 0) > (maxHours[prev] || 0) ? current : prev
      );

      const dayIndex = dayAssignments.findIndex(a => a.day === largestDay);
      dayAssignments[dayIndex].tasks.push({
        ...currentTask,
        status: 'assigned'
      });
      dayAssignments[dayIndex].hoursUsed += currentTask.weight;
      currentTaskIndex++;

      const allWeekTasks = dayAssignments.flatMap(a => a.tasks);
      weeks.push({
        weekNumber,
        days: selectedDays,
        hours: { ...dailyHours },
        tasks: allWeekTasks,
        dayAssignments,
      });
      weekNumber++;
    }
  }

  return weeks;
}

/**
 * Re-schedule tasks for a specific week when hours are overridden
 * Only considers uncompleted tasks for the override
 * Once a day hits capacity, no more tasks are added to it
 */
export function rescheduleWeek(
  week: EnhancedWeekSchedule,
  newDays: string[],
  newHours: Record<string, number>,
  allUncompletedTasks: Task[],
  completedTasksByDay?: Record<string, Task[]>
): { updatedWeek: EnhancedWeekSchedule; remainingTasks: Task[] } {
  const tasksToReallocate = allUncompletedTasks;
  const dayAssignments: DayTaskAssignment[] = newDays.map(day => {
    // Initialize with completed tasks that should stay on this day
    const completedTasks = completedTasksByDay?.[day] || [];
    const completedHours = completedTasks.reduce((sum, t) => sum + t.weight, 0);

    return {
      day,
      tasks: completedTasks,
      hoursUsed: completedHours,
    };
  });

  let taskIndex = 0;
  const fullDays = new Set<string>();

  // Try to fit tasks into this week
  while (taskIndex < tasksToReallocate.length) {
    const currentTask = tasksToReallocate[taskIndex];
    let placed = false;

    // Try to place task in first available non-full day
    for (const assignment of dayAssignments) {
      // Skip days that are already at capacity
      if (fullDays.has(assignment.day)) {
        continue;
      }

      const dayMax = newHours[assignment.day] || 0;
      if (assignment.hoursUsed + currentTask.weight <= dayMax) {
        assignment.tasks.push({
          ...currentTask,
          status: 'assigned'
        });
        assignment.hoursUsed += currentTask.weight;

        // If this task fills the day to capacity, mark it as full
        if (assignment.hoursUsed === dayMax) {
          fullDays.add(assignment.day);
        }

        taskIndex++;
        placed = true;
        break;
      } else {
        // Day can't fit this task, so mark it as full
        fullDays.add(assignment.day);
      }
    }

    // If not placed, move to next week
    if (!placed) {
      break;
    }
  }

  const unallocatedTasks = tasksToReallocate.slice(taskIndex);
  const allWeekTasks = dayAssignments.flatMap(a => a.tasks);

  return {
    updatedWeek: {
      ...week,
      days: newDays,
      hours: { ...newHours },
      tasks: allWeekTasks,
      dayAssignments,
    },
    remainingTasks: unallocatedTasks,
  };
}

/**
 * Calculate total hours available per week
 */
export function calculateWeeklyHours(
  days: string[],
  hours: Record<string, number>
): number {
  return days.reduce((total, day) => total + (hours[day] || 0), 0);
}
