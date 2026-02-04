import { cn } from "@/lib/utils";

interface WeekdayButtonProps {
  day: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function WeekdayButton({ day, selected = false, onClick }: WeekdayButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative w-12 h-12 rounded border-2 shadow-md transition-colors",
        "flex items-center justify-center font-lato",
        selected
          ? "bg-[#78C4AB] border-[#78C4AB] text-white"
          : "bg-white border-brand-navy text-brand-navy"
      )}
    >
      <span className="text-2xl font-extrabold select-none">
        {day}
      </span>
    </button>
  );
}
