import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { displayToMinutes, minutesToDisplay } from "@/lib/timeUtils";

interface TimeInputProps {
  value: number; // stored in minutes
  onChange: (minutes: number) => void;
  label?: string;
  max?: number;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
  step?: number; // step in minutes (default 15)
}

export default function TimeInput({
  value,
  onChange,
  label,
  max = 24 * 60,
  min = 0,
  disabled = false,
  placeholder = "e.g. 2h 30m",
  step = 15,
}: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState(minutesToDisplay(value));
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(minutesToDisplay(value));
    }
  }, [value, isEditing]);

  const handleIncrement = () => {
    let newValue = value + step;
    if (newValue > max) newValue = max;
    onChange(newValue);
    setError("");
  };

  const handleDecrement = () => {
    let newValue = value - step;
    if (newValue < min) newValue = min;
    onChange(newValue);
    setError("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    setError("");
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);

    const trimmed = displayValue.trim();
    if (trimmed === "") {
      onChange(0);
      setDisplayValue(minutesToDisplay(0));
      setError("");
      return;
    }

    const minutes = displayToMinutes(trimmed);

    if (minutes < 0) {
      setError("Time cannot be negative");
      setDisplayValue(minutesToDisplay(value));
      return;
    }

    if (minutes > max) {
      setError(`Maximum time is ${minutesToDisplay(max)}`);
      setDisplayValue(minutesToDisplay(value));
      return;
    }

    if (minutes < min) {
      setError(`Minimum time is ${minutesToDisplay(min)}`);
      setDisplayValue(minutesToDisplay(value));
      return;
    }

    // Round to nearest step if provided
    const rounded = Math.round(minutes / step) * step;
    onChange(rounded);
    setDisplayValue(minutesToDisplay(rounded));
  };

  const handleFocus = () => {
    setError("");
    setIsEditing(true);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-lato text-black">{label}</label>
      )}
      <div className="flex flex-col gap-1">
        <div className={`flex items-center border rounded ${error ? "border-red-500" : "border-gray-300"} ${disabled ? "bg-gray-100" : "bg-white"}`}>
          <button
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className={`p-1 flex items-center justify-center ${
              disabled || value <= min
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-100"
            } transition-colors`}
            type="button"
            aria-label="Decrease time"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={`flex-1 px-2 py-1 text-center font-lato border-0 outline-none ${
              disabled ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          />

          <button
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className={`p-1 flex items-center justify-center ${
              disabled || value >= max
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-100"
            } transition-colors`}
            type="button"
            aria-label="Increase time"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <span className="text-xs text-red-500 font-lato">{error}</span>
        )}
      </div>
    </div>
  );
}
