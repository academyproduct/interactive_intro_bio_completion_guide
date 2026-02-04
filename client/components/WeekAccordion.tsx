import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { minutesToDisplay } from "@/lib/timeUtils";
import { Task, DayTaskAssignment } from "@shared/tasks";
import TimeInput from "./TimeInput";
import DayBlock from "./DayBlock";

interface WeekAccordionProps {
  weekNumber: number;
  isOpen?: boolean;
  days: string[];
  minutes: Record<string, number>;
  dayAssignments: DayTaskAssignment[];
  checkedTaskIds: number[];
  onTaskToggle: (weekNumber: number, dayKey: string, taskId: number) => void;
  onWeekOverride?: (days: string[], minutes: Record<string, number>) => void;
  isFinalWeek?: boolean;
  finalDayKey?: string;
}

const DAY_DEFINITIONS = [
  { name: "Monday", abbr: "MON", key: "M" },
  { name: "Tuesday", abbr: "TUES", key: "T" },
  { name: "Wednesday", abbr: "WED", key: "W" },
  { name: "Thursday", abbr: "THUR", key: "Th" },
  { name: "Friday", abbr: "FRI", key: "F" },
  { name: "Saturday", abbr: "SAT", key: "S" },
  { name: "Sunday", abbr: "SUN", key: "Su" },
];

export default function WeekAccordion({
  weekNumber,
  isOpen = false,
  days,
  minutes,
  dayAssignments,
  checkedTaskIds,
  onTaskToggle,
  onWeekOverride,
  isFinalWeek = false,
  finalDayKey = "",
}: WeekAccordionProps) {
  const [expanded, setExpanded] = useState(isOpen);
  const [expandedDayKey, setExpandedDayKey] = useState<string>(days.length > 0 ? days[0] : "");

  // Customize mode state
  const [customizeMode, setCustomizeMode] = useState(false);
  const [overrideDays, setOverrideDays] = useState<string[]>(days);
  const [overrideMinutes, setOverrideMinutes] = useState<Record<string, number>>({ ...minutes });

  const selectedDays = customizeMode ? overrideDays : days;
  const displayMinutes = customizeMode ? overrideMinutes : minutes;

  const toggleDayInCustomize = (dayKey: string) => {
    setOverrideDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleApplyOverride = () => {
    if (onWeekOverride) {
      onWeekOverride(overrideDays, overrideMinutes);
    }
    setCustomizeMode(false);
  };

  // Get tasks for a specific day
  const getTasksForDay = (dayKey: string): Task[] => {
    const assignment = dayAssignments.find(a => a.day === dayKey);
    return assignment?.tasks || [];
  };

  // Get completion circles - show for all active days
  const completionCircles = selectedDays.map((dayKey) => {
    const dayTasks = getTasksForDay(dayKey);
    const completedCount = dayTasks.filter(t => checkedTaskIds.includes(t.id)).length;
    const isComplete = dayTasks.length > 0 && completedCount === dayTasks.length;
    const incompleteCount = dayTasks.length - completedCount;
    return { dayKey, isComplete, incompleteCount };
  });

  return (
    <div className="w-full" id={`week${weekNumber}`}>
      <div className="flex items-center justify-center mb-2.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={customizeMode}
            onChange={(e) => {
              setCustomizeMode(e.target.checked);
              if (e.target.checked && !expanded) {
                setExpanded(true);
              }
            }}
            className="w-5 h-5 rounded-full border-2 border-brand-teal cursor-pointer"
          />
          <span className="text-black text-lg font-normal font-lato">
            Customize Week {weekNumber}'s hours
          </span>
        </label>
      </div>

      <div className="border-2 border-brand-navy rounded-lg bg-white p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-8 flex-1">
            <h2 className="text-brand-navy text-4xl font-semibold font-lato">Week {weekNumber}</h2>
            <div className="flex gap-4 justify-center flex-wrap">
              {completionCircles.map(({ dayKey, isComplete, incompleteCount }) => (
                <div
                  key={dayKey}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold",
                    isComplete
                      ? "bg-brand-teal border-brand-teal"
                      : "border-brand-teal bg-white"
                  )}
                >
                  {!isComplete && incompleteCount > 0 && (
                    <span className="text-brand-teal text-sm">{incompleteCount}</span>
                  )}
                  {isComplete && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <ChevronDown className={cn("w-8 h-8 text-brand-navy transition-transform shrink-0", expanded && "rotate-180")} />
        </button>

        {expanded && (
          <>
            <div className="w-full h-0.5 bg-brand-navy my-4" />

            {customizeMode && (
              <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
                <p className="text-base font-lato text-black mb-3 font-bold">Override days and hours for Week {weekNumber}:</p>

                <div className="mb-4">
                  <p className="text-base font-lato text-black mb-2">Select days:</p>
                  <div className="flex flex-wrap gap-2">
                    {DAY_DEFINITIONS.map((day) => (
                      <label key={day.key} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideDays.includes(day.key)}
                          onChange={() => toggleDayInCustomize(day.key)}
                          className="cursor-pointer"
                        />
                        <span className="text-base font-lato">{day.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <p className="text-base font-lato text-black mb-2">Set hours (only for selected days):</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {overrideDays.sort((a, b) => {
                    const aIndex = DAY_DEFINITIONS.findIndex((d) => d.key === a);
                    const bIndex = DAY_DEFINITIONS.findIndex((d) => d.key === b);
                    return aIndex - bIndex;
                  }).map((dayKey) => {
                    const day = DAY_DEFINITIONS.find((d) => d.key === dayKey);
                    if (!day) return null;
                    return (
                      <TimeInput
                        key={dayKey}
                        label={day.name}
                        value={overrideMinutes[dayKey] ?? 0}
                        onChange={(mins) =>
                          setOverrideMinutes((prev) => ({
                            ...prev,
                            [dayKey]: mins,
                          }))
                        }
                        max={24 * 60}
                        min={0}
                        placeholder="e.g. 2h 30m"
                      />
                    );
                  })}
                </div>

                <button
                  onClick={handleApplyOverride}
                  className="w-full px-4 py-2 bg-brand-blue text-white rounded font-lato text-sm font-bold hover:bg-[#0070CC] transition-colors"
                >
                  Apply Override
                </button>
              </div>
            )}

            <div className="flex gap-4 px-2 justify-center flex-wrap w-full">
              {DAY_DEFINITIONS.map((day, dayIndex) => {
                const isSelected = selectedDays.includes(day.key);
                const isExpanded = expandedDayKey === day.key;
                const dayTasks = getTasksForDay(day.key);
                const isFinalDay = isFinalWeek && day.key === finalDayKey;

                // Adapter to attach week/day metadata
                const handleTaskToggleForDay = (taskId: number) => {
                  onTaskToggle(weekNumber, day.key, taskId);
                };

                return (
                  <div key={day.key} id={`week${weekNumber}-day${dayIndex + 1}`} className="flex-shrink-0">
                    <DayBlock
                      day={day}
                      isExpanded={isExpanded}
                      onExpand={() => {
                        if (isSelected) {
                          setExpandedDayKey(isExpanded ? "" : day.key);
                        }
                      }}
                      isActive={isSelected}
                      tasks={dayTasks}
                      checkedTaskIds={checkedTaskIds}
                      onTaskToggle={handleTaskToggleForDay}
                      onAllTasksToggle={() => {
                        const allTaskIds = dayTasks.map((t) => t.id);
                        const allChecked = allTaskIds.every((id) => checkedTaskIds.includes(id));
              
                        if (allChecked) {
                          allTaskIds.forEach((id) => handleTaskToggleForDay(id));
                        } else {
                          allTaskIds.forEach((id) => {
                            if (!checkedTaskIds.includes(id)) {
                              handleTaskToggleForDay(id);
                            }
                          });
                        }
                      }}
                      isReadOnly={false}
                      isFinalDay={isFinalDay}
                    />
                  </div>
                );
              })}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
