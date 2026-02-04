import { cn } from "@/lib/utils";
import { Task } from "@shared/tasks";

interface DayBlockProps {
  day: {
    name: string;
    abbr: string;
    key: string;
  };
  isExpanded: boolean;
  onExpand: () => void;
  isActive: boolean;
  tasks: Task[];
  checkedTaskIds: number[];
  onTaskToggle: (id: number) => void;
  onAllTasksToggle: () => void;
  isReadOnly?: boolean;
  isFinalDay?: boolean;
}

export default function DayBlock({
  day,
  isExpanded,
  onExpand,
  isActive,
  tasks,
  checkedTaskIds,
  onTaskToggle,
  onAllTasksToggle,
  isReadOnly = false,
  isFinalDay = false,
}: DayBlockProps) {
  const allChecked = tasks.length > 0 && tasks.every(t => checkedTaskIds.includes(t.id));
  const incompleteCount = tasks.filter(t => !checkedTaskIds.includes(t.id)).length;

  if (isExpanded) {
    return (
      <div className={cn("w-80 h-[300px] p-4 flex flex-col gap-3 border-4 shrink-0", isFinalDay ? "border-brand-teal bg-brand-teallight" : "border-brand-navy bg-white")}>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={onAllTasksToggle}
            disabled={isReadOnly || tasks.length === 0}
            className="w-6 h-6 rounded-full border border-brand-lightgrey cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-black text-lg font-bold font-lato capitalize">{day.name}</span>
        </div>
        <div className="w-full h-0.5 bg-brand-navy" />
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {tasks.length === 0 ? (
            <p className="text-black text-sm text-center py-4">No tasks assigned</p>
          ) : (
            <>
              {tasks.map((task) => (
                <div key={task.id} id={`task-${task.id}`} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={checkedTaskIds.includes(task.id)}
                    onChange={() => onTaskToggle(task.id)}
                    disabled={isReadOnly}
                    className="w-6 h-6 rounded-full border border-brand-lightgrey cursor-pointer shrink-0 mt-0.5 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-black text-base font-bold font-lato">{task.unit}</p>
                    <p className="text-black text-sm font-normal font-lato ml-6 break-words">
                      {task.page} ({task.activity_type})
                    </p>
                  </div>
                </div>
              ))}
              {isFinalDay && (
                <div className="mt-4 pt-4 border-t-2 border-brand-teal text-center">
                  <p className="text-brand-navy text-base font-bold font-lato">
                    🎉 Congratulations, you've completed the course!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onExpand}
      disabled={!isActive}
      className={cn(
        "w-[84px] h-[300px] relative shrink-0 border-2 flex items-center justify-center transition-all",
        isFinalDay
          ? "bg-brand-teal border-brand-teal cursor-pointer hover:shadow-lg"
          : isActive
          ? "cursor-pointer bg-brand-navy border-brand-navy hover:shadow-lg"
          : "bg-brand-grey border-brand-grey cursor-not-allowed opacity-50"
      )}
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-90deg] whitespace-nowrap">
        <span className="text-white text-4xl font-extrabold font-lato uppercase">
          {day.abbr}
        </span>
      </div>
      <div className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center font-lato font-bold",
        allChecked && tasks.length > 0 ? "bg-brand-navy border-2 border-white" : "bg-white"
      )}>
        {allChecked && tasks.length > 0 && (
          <div className="w-3 h-3 rounded-full bg-white" />
        )}
        {!allChecked && isActive && incompleteCount > 0 && (
          <span className="text-brand-navy text-sm">{incompleteCount}</span>
        )}
      </div>
    </button>
  );
}
