import type { Task } from "@shared/tasks";
import { sendXapiStatement } from "./xapiSend";

const VERBS = {
  selected: {
    id: "http://id.tincanapi.com/verb/selected",
    display: { "en-US": "selected" },
  },
  discarded: {
    id: "http://id.tincanapi.com/verb/discarded",
    display: { "en-US": "discarded" },
  },
} as const;

export type CheckboxXapiContext = {
  weekNumber: number;   // e.g. 1
  dayKey: string;       // e.g. "M", "T", "W", "Th", "F", "S", "Su"
  task: Task;           // the full task object
  checked: boolean;     // true = user just checked it, false = unchecked
};

/**
 * Returns a stable pseudonymous ID for this browser/device using localStorage for testing
 */
function getOrCreateUserId(): string {
  const key = "demo_actor_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id =
    (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  localStorage.setItem(key, id);
  return id;
}

/**
 * Call this whenever a checkbox is toggled.
 * It centralizes how we translate UI context → xAPI statement → send.
 */
export async function sendCheckboxXapi(ctx: CheckboxXapiContext) {
  const { weekNumber, dayKey, task, checked } = ctx;

  const verb = checked ? VERBS.selected : VERBS.discarded;

  const taskLabel = `Module ${task.module} · ${task.unit} · Page ${task.page} · ${task.activity_type}`;

  // Pseudonymous actor id (stable per browser)
  const userId = getOrCreateUserId();
  const actor = {
    account: {
      homePage: "https://academyproduct.github.io/dynamic_completion_guide",
      name: userId,
    },
  };

  const statement = {
    actor,
    verb,
    object: {
      // Stable/meaningful activity ID for the task
      id: `https://academyproduct.github.io/dynamic_completion_guide/xapi/task/${task.id}`,
      definition: {
        name: { "en-US": taskLabel },
        type: "http://adlnet.gov/expapi/activities/lesson",
      },
    },
    context: {
      contextActivities: {
        parent: [
          {
            id: `https://academyproduct.github.io/dynamic_completion_guide/xapi/week/${weekNumber}/day/${dayKey}`,
            definition: {
              name: { "en-US": `Week ${weekNumber} · ${dayKey}` },
            },
          },
        ],
      },
      extensions: {
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/weekNumber": weekNumber,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/dayKey": dayKey,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/taskId": task.id,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/module": task.module,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/unit": task.unit,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/page": task.page,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/activity_type": task.activity_type,
      },
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await sendXapiStatement(statement);
    console.log("[xAPI] Sent", {
      verb: verb.display["en-US"],
      weekNumber,
      dayKey,
      taskId: task.id,
      taskLabel,
    });
  } catch (err) {
    console.error("[xAPI] Failed to send", err);
  }

}
type DayKey = "M" | "T" | "W" | "Th" | "F" | "S" | "Su";

function getActor() {
  const userId = getOrCreateUserId();
  return {
    account: {
      homePage: "https://academyproduct.github.io/dynamic_completion_guide",
      name: userId,
    },
  };
}

/**
 * Track when the user selects a desired completion date.
 * completionDate should be the <input type="date"> value: "YYYY-MM-DD"
 */
export async function sendCompletionDateXapi(completionDate: string) {
  const actor = getActor();

  const statement = {
    actor,
    verb: VERBS.selected,
    object: {
      id: "https://academyproduct.github.io/dynamic_completion_guide/xapi/ui/completion-date",
      definition: {
        name: { "en-US": "Desired Completion Date" },
        type: "http://adlnet.gov/expapi/activities/interaction",
      },
    },
    context: {
      extensions: {
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/completionDate": completionDate,
      },
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await sendXapiStatement(statement);
    console.log("[xAPI] Sent", { event: "completionDate", completionDate });
  } catch (err) {
    console.error("[xAPI] Failed to send", err);
  }
}

/**
 * Track when the user selects or unselects a study day.
 */
export async function sendScheduleDaySelectionXapi(dayKey: DayKey, selected: boolean) {
  const actor = getActor();
  const verb = selected ? VERBS.selected : VERBS.discarded;

  const statement = {
    actor,
    verb,
    object: {
      id: "https://academyproduct.github.io/dynamic_completion_guide/xapi/ui/schedule/day-selection",
      definition: {
        name: { "en-US": "Schedule Time to Learn - Day Selection" },
        type: "http://adlnet.gov/expapi/activities/interaction",
      },
    },
    context: {
      extensions: {
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/dayKey": dayKey,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/selected": selected,
      },
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await sendXapiStatement(statement);
    console.log("[xAPI] Sent", { event: "scheduleDay", dayKey, selected });
  } catch (err) {
    console.error("[xAPI] Failed to send", err);
  }
}

/**
 * Track when the user sets time (minutes) for a given day.
 * Recommend calling on blur (your TimeInput does this) and on increment/decrement.
 */
export async function sendScheduleMinutesXapi(dayKey: DayKey, minutes: number) {
  const actor = getActor();

  const statement = {
    actor,
    // "selected" is OK for a value-set action; if you prefer, swap to an "interacted" verb later
    verb: VERBS.selected,
    object: {
      id: "https://academyproduct.github.io/dynamic_completion_guide/xapi/ui/schedule/minutes",
      definition: {
        name: { "en-US": "Schedule Time to Learn - Minutes Set" },
        type: "http://adlnet.gov/expapi/activities/interaction",
      },
    },
    context: {
      extensions: {
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/dayKey": dayKey,
        "https://academyproduct.github.io/dynamic_completion_guide/xapi/ext/minutes": minutes,
      },
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await sendXapiStatement(statement);
    console.log("[xAPI] Sent", { event: "scheduleMinutes", dayKey, minutes });
  } catch (err) {
    console.error("[xAPI] Failed to send", err);
  }
}
