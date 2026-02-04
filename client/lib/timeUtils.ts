/**
 * Convert minutes to display format "Xh YYm"
 */
export function minutesToDisplay(minutes: number): string {
  if (minutes === 0) return "0m";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Convert display format "Xh YYm" to minutes
 * Accepts: "2h 30m", "2h", "30m", "2", "2.5"
 */
export function displayToMinutes(input: string): number {
  const trimmed = input.trim().toLowerCase();
  
  if (!trimmed) return 0;
  
  // Handle "Xh YYm" format
  const timeRegex = /(\d+(?:\.\d+)?)\s*h(?:our)?s?/i;
  const minRegex = /(\d+(?:\.\d+)?)\s*m(?:inute)?s?/i;
  
  let totalMinutes = 0;
  
  const hourMatch = trimmed.match(timeRegex);
  if (hourMatch) {
    totalMinutes += Math.floor(parseFloat(hourMatch[1]) * 60);
  }
  
  const minMatch = trimmed.match(minRegex);
  if (minMatch) {
    totalMinutes += Math.floor(parseFloat(minMatch[1]));
  }
  
  // If no format matched, try parsing as decimal hours
  if (totalMinutes === 0) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      totalMinutes = Math.floor(num * 60);
    }
  }
  
  return totalMinutes;
}

/**
 * Round minutes to nearest 5-minute increment
 */
export function roundToFiveMinutes(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

/**
 * Validate and sanitize time input
 */
export function validateTimeInput(input: string): { valid: boolean; minutes: number; error?: string } {
  try {
    const minutes = displayToMinutes(input);
    
    if (minutes < 0) {
      return { valid: false, minutes: 0, error: "Time cannot be negative" };
    }
    
    if (minutes > 24 * 60) {
      return { valid: false, minutes: 0, error: "Time cannot exceed 24 hours" };
    }
    
    return { valid: true, minutes };
  } catch {
    return { valid: false, minutes: 0, error: "Invalid time format" };
  }
}
