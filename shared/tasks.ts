export type TaskStatus = 'available' | 'assigned' | 'completed';
export type ActivityType = 'read' | 'review' | 'test';

export interface Task {
  id: number;
  module: number;
  unit: string;
  page: string;
  activity_type: ActivityType;
  weight: number;
  status?: TaskStatus;
}

export interface TaskPool {
  available: Task[];
  assigned: Task[];
  completed: Task[];
}

export interface DayTaskAssignment {
  day: string;
  tasks: Task[];
  hoursUsed: number;
}

export interface WeekSchedule {
  weekNumber: number;
  days: string[];
  hours: Record<string, number>;
  tasks: Task[];
  dayAssignments?: DayTaskAssignment[];
}

export interface ScheduleData {
  weeks: WeekSchedule[];
  completionDate: string;
}
