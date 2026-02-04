import { useState, useEffect } from "react";
import WeekdayButton from "@/components/WeekdayButton";
import WeekAccordion from "@/components/WeekAccordion";
import TimeInput from "@/components/TimeInput";
import { loadTasks, initializeTaskPool } from "@/lib/taskLoader";
import { greedyScheduleTasks, rescheduleWeek, type EnhancedWeekSchedule } from "@/lib/scheduler";
import { minutesToDisplay } from "@/lib/timeUtils";
import type { Task, TaskPool } from "@shared/tasks";
import {
  sendCheckboxXapi,
  sendCompletionDateXapi,
  sendScheduleDaySelectionXapi,
  sendScheduleMinutesXapi,
} from "@/lib/xapi";



const WEEKDAYS = [
  { key: "M", label: "M", name: "Monday" },
  { key: "T", label: "T", name: "Tuesday" },
  { key: "W", label: "W", name: "Wednesday" },
  { key: "Th", label: "Th", name: "Thursday" },
  { key: "F", label: "F", name: "Friday" },
  { key: "S", label: "S", name: "Saturday" },
  { key: "Su", label: "Su", name: "Sunday" },
];

const STORAGE_KEY = "completion-guide-state";

export default function Index() {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [minutesPerDay, setMinutesPerDay] = useState<Record<string, number>>({}); // stored in minutes
  const [completionDate, setCompletionDate] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [weeks, setWeeks] = useState<EnhancedWeekSchedule[]>([]);
  const [checkedTaskIds, setCheckedTaskIds] = useState<Set<number>>(new Set());
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskPool, setTaskPool] = useState<TaskPool>({ available: [], assigned: [], completed: [] });
  const [warnings, setWarnings] = useState<{ unallocatedTasks: boolean; exceededDate: boolean }>({
    unallocatedTasks: false,
    exceededDate: false,
  });

  // Save state to localStorage
  const saveToLocalStorage = () => {
    try {
      const state = {
        selectedDays,
        minutesPerDay,
        completionDate,
        submitted,
        weeks,
        checkedTaskIds: Array.from(checkedTaskIds),
        warnings,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  };

  // Load state from localStorage
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        setSelectedDays(state.selectedDays || []);
        setMinutesPerDay(state.minutesPerDay || {});
        setCompletionDate(state.completionDate || "");
        setSubmitted(state.submitted || false);
        setWeeks(state.weeks || []);
        setCheckedTaskIds(new Set(state.checkedTaskIds || []));
        setWarnings(state.warnings || { unallocatedTasks: false, exceededDate: false });
        return true;
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
    }
    return false;
  };

  // Load tasks on component mount
  useEffect(() => {
    const loadAndInitialize = async () => {
      const tasks = await loadTasks();
      setAllTasks(tasks);
      setTaskPool(initializeTaskPool(tasks));

      // Try to load state from localStorage after tasks are loaded
      loadFromLocalStorage();
    };
    loadAndInitialize();
  }, []);

//day selection, with analytics included
  const toggleDay = (dayKey: DayKey) => {
  setSelectedDays(prev => {
    const wasSelected = prev.includes(dayKey);
    const nowSelected = !wasSelected;

    // fire xAPI outside of setState purity concerns
    queueMicrotask(() => sendScheduleDaySelectionXapi(dayKey, nowSelected));
    // or: setTimeout(() => ..., 0);

    if (wasSelected) {
      setMinutesPerDay(prevMinutes => {
        const copy = { ...prevMinutes };
        delete copy[dayKey];
        return copy;
      });
      return prev.filter(d => d !== dayKey);
    }

    return [...prev, dayKey];
  });
};


  const handleMinutesChange = (dayKey: string, minutes: number) => {
    setMinutesPerDay((prev) => ({ ...prev, [dayKey]: minutes }));
    sendScheduleMinutesXapi(dayKey as any, minutes);
  };

const handleTaskToggle = (weekNumber: number, dayKey: string, taskId: number) => {
  setCheckedTaskIds((prev) => {
    const newSet = new Set(prev);
    const wasChecked = newSet.has(taskId);
    const willBeChecked = !wasChecked;

    if (willBeChecked) newSet.add(taskId);
    else newSet.delete(taskId);

    // Look up the full Task object for xAPI context
    const week = weeks.find((w) => w.weekNumber === weekNumber);
    const assignment = week?.dayAssignments?.find((a) => a.day === dayKey);
    const task = assignment?.tasks.find((t) => t.id === taskId);

    if (task) {
      sendCheckboxXapi({
        weekNumber,
        dayKey,
        task,
        checked: willBeChecked,
      });
    } else {
      console.warn("Task not found for xAPI", { weekNumber, dayKey, taskId });
    }

    return newSet;
  });
};


  const handleWeekOverride = (weekIndex: number, newDays: string[], newHours: Record<string, number>) => {
    const currentWeek = weeks[weekIndex];

    // Separate completed and uncompleted tasks in the current week
    const completedTasksByDay: Record<string, Task[]> = {};
    const uncompletedTasksInCurrentWeek: Task[] = [];

    currentWeek.dayAssignments.forEach((assignment) => {
      const dayCompleted: Task[] = [];
      assignment.tasks.forEach((task) => {
        if (checkedTaskIds.has(task.id)) {
          dayCompleted.push(task);
        } else {
          uncompletedTasksInCurrentWeek.push(task);
        }
      });
      if (dayCompleted.length > 0) {
        completedTasksByDay[assignment.day] = dayCompleted;
      }
    });

    // Get all tasks that haven't been completed yet from future weeks
    const allTasksInFutureWeeks = weeks.slice(weekIndex + 1).flatMap(w => w.tasks);
    const uncompletedTasksInFutureWeeks = allTasksInFutureWeeks.filter(
      t => !checkedTaskIds.has(t.id)
    );

    // Combine uncompleted tasks from current and future weeks
    const allUncompletedTasksToReallocate = [...uncompletedTasksInCurrentWeek, ...uncompletedTasksInFutureWeeks];

    const { updatedWeek, remainingTasks: unallocated } = rescheduleWeek(
      currentWeek,
      newDays,
      newHours,
      allUncompletedTasksToReallocate,
      completedTasksByDay
    );

    const newWeeks = [...weeks];
    newWeeks[weekIndex] = updatedWeek;

    // Re-schedule remaining weeks if tasks were freed up
    if (unallocated.length > 0) {
      // Remove all weeks after the current one, we'll rebuild them
      newWeeks.splice(weekIndex + 1);

      // If there are more weeks after this, use their original schedule as template
      // Otherwise, use the current week's original schedule (before override)
      const templateWeek = weeks[weekIndex + 1] || currentWeek;
      const templateDays = templateWeek.days;
      const templateHours = templateWeek.hours;

      // Reschedule unallocated tasks starting from the next week
      const rescheduled = greedyScheduleTasks(
        { available: unallocated, assigned: [], completed: [] },
        templateDays,
        templateHours,
        weekIndex + 2
      );
      newWeeks.push(...rescheduled);
    }

    setWeeks(newWeeks);
  };

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (allTasks.length > 0) {
      saveToLocalStorage();
    }
  }, [selectedDays, minutesPerDay, completionDate, submitted, weeks, checkedTaskIds, warnings]);

  const handleSubmit = () => {
    // Basic validation: require a date and at least one selected day
    if (!completionDate) {
      alert("Please pick a completion date.");
      return;
    }
    if (selectedDays.length === 0) {
      alert("Please select at least one weekday.");
      return;
    }

    // If any selected day is missing minutes, default to 60 minutes (1 hour)
    const normalizedMinutes = { ...minutesPerDay };
    selectedDays.forEach((d) => {
      if (!normalizedMinutes[d] || normalizedMinutes[d] === 0) {
        normalizedMinutes[d] = 60; // 1 hour default
      }
    });
    setMinutesPerDay(normalizedMinutes);

    // Run greedy scheduling algorithm
    const generatedWeeks = greedyScheduleTasks(
      taskPool,
      selectedDays,
      normalizedMinutes,
      1
    );

    // Calculate completion date and check for warnings
    const completionDateObj = new Date(completionDate);
    const todayObj = new Date();
    const daysUntilCompletion = Math.floor((completionDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
    const weeksUntilCompletion = Math.ceil(daysUntilCompletion / 7);

    // Check if all tasks were allocated
    const allocatedTaskCount = generatedWeeks.flatMap(w => w.tasks).length;
    const totalTaskCount = allTasks.length;
    const allTasksAllocated = allocatedTaskCount === totalTaskCount;

    // Check if weeks exceed completion date
    const weeksGenerated = generatedWeeks.length;
    const exceededCompletionDate = weeksGenerated > weeksUntilCompletion;

    setWeeks(generatedWeeks);
    setWarnings({
      unallocatedTasks: !allTasksAllocated,
      exceededDate: exceededCompletionDate,
    });
    setSubmitted(true);

    // scroll to weeks
    setTimeout(() => {
      const el = document.getElementById("weeks");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white py-20 px-4 sm:px-8 md:px-16 lg:px-32">
      <div className="max-w-[1289px] mx-auto flex flex-col items-center gap-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-black text-center font-lato">
          American Politics & the U.S. Constitution Completion Guide
        </h1>

        <div className="max-w-[911px] text-center">
          <p className="text-base text-black font-lato">
            Ready to get organized and stay on track? You can generate an <span className="font-bold">Interactive American Politics & the U.S. Constitution Completion Guide</span> by filling out the following fields.
          </p>
          <p className="text-base text-black font-lato mt-4">
            First, choose the date by which you want to be finished with your course. When adding this target course completion date,
            <span className="font-bold"> check the length of your course access period. </span>
             If you're unsure when your access to your course expires, navigate to the American Politics & the U.S. Constitution page on the dashboard and look for the date to the right of the Resume button.
            <span className="font-bold"> If you do not complete your course before your access period ends, you will incur additional tuition charges.</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-[262px]">
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-center text-black text-base font-bold font-lato">
              Select a desired completion date:
            </label>
            <input
              type="date"
              value={completionDate}
              // onChange={(e) => setCompletionDate(e.target.value)}
              onChange={(e) => {
                const value = e.target.value; // "YYYY-MM-DD"
                setCompletionDate(value);
                if (value) sendCompletionDateXapi(value);
              }}

              className="w-full px-4 py-3 text-center border-[1.4px] border-black/30 rounded text-lg"
            />
          </div>
        </div>

        <div className="max-w-[911px] text-center">
          <p className="text-base text-black font-lato">
            Next, let's set up your daily and weekly schedule. Choose the days you can commit to working on your coursework and select the number of hours/minutes you can dedicate each day. Then select <span className="font-bold">Submit.</span>
          </p>
        </div>

        <div className="w-full max-w-[1001px] bg-[rgba(214,232,242,0.45)] border-2 border-[#D6E8F2] rounded-lg p-8 flex flex-col items-center gap-8">
          <div className="w-full flex flex-col items-center gap-8">
            <h2 className="text-2xl font-bold text-black text-center font-lato">Schedule time to learn</h2>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-9">
              {WEEKDAYS.map((day) => (
                <div key={day.key} className="flex flex-col items-center gap-2">
                  <WeekdayButton
                    day={day.label}
                    selected={selectedDays.includes(day.key)}
                    onClick={() => toggleDay(day.key)}
                  />
                </div>
              ))}
            </div>

            {selectedDays.length > 0 && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-black text-base font-bold font-lato">Hours</div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {selectedDays.sort((a, b) => {
                    const aIndex = WEEKDAYS.findIndex((w) => w.key === a);
                    const bIndex = WEEKDAYS.findIndex((w) => w.key === b);
                    return aIndex - bIndex;
                  }).map((d) => {
                    const wd = WEEKDAYS.find((w) => w.key === d)!;
                    return (
                      <TimeInput
                        key={d}
                        label={`${wd.name}:`}
                        value={minutesPerDay[d] || 0}
                        onChange={(minutes) => handleMinutesChange(d, minutes)}
                        max={24 * 60}
                        min={0}
                        placeholder="e.g. 2h 30m"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 bg-[#008AFF] rounded text-white text-base font-bold font-lato hover:bg-[#0070CC] transition-colors"
          >
            Submit
          </button>
        </div>

        <div id="weeks" className="w-full max-w-[1001px] flex flex-col items-center gap-6 mt-8">
          {submitted && weeks.length > 0 ? (
            <>
              {warnings.unallocatedTasks && (
                <div className="w-full bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-red-700 text-base font-bold font-lato">
                    ⚠️ The hours you have submitted does not allow all tasks in this course to fully populate to meet your desired completion date.
                  </p>
                </div>
              )}
              {warnings.exceededDate && (
                <div className="w-full bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-red-700 text-base font-bold font-lato">
                    ⚠️ The hours you have submitted are insufficient for you to finish your course by the desired completion date.
                  </p>
                </div>
              )}
              {(() => {
                // Find the last day with tasks
                let lastWeekWithTasks = -1;
                let lastDayWithTasks = "";

                for (let i = weeks.length - 1; i >= 0; i--) {
                  const week = weeks[i];
                  for (let j = week.dayAssignments.length - 1; j >= 0; j--) {
                    if (week.dayAssignments[j].tasks.length > 0) {
                      lastWeekWithTasks = i;
                      lastDayWithTasks = week.dayAssignments[j].day;
                      break;
                    }
                  }
                  if (lastWeekWithTasks !== -1) break;
                }

                return weeks.map((week, index) => (
                  <WeekAccordion
                    key={`week-${week.weekNumber}`}
                    weekNumber={week.weekNumber}
                    isOpen={index === 0}
                    days={week.days}
                    minutes={week.hours}
                    dayAssignments={week.dayAssignments || []}
                    checkedTaskIds={Array.from(checkedTaskIds)}
                    onTaskToggle={handleTaskToggle}
                    onWeekOverride={(newDays, newMinutes) => handleWeekOverride(index, newDays, newMinutes)}
                    isFinalWeek={index === lastWeekWithTasks}
                    finalDayKey={index === lastWeekWithTasks ? lastDayWithTasks : ""}
                  />
                ));
              })()}
            </>
          ) : submitted ? (
            <div className="text-center text-sm text-slate-500">No tasks to display. Check your schedule settings.</div>
          ) : (
            <div className="text-center text-sm text-slate-500">Fill out the date and schedule above, then click Submit to generate the weekly plan.</div>
          )}
        </div>
      </div>
    </div>
  );
}
