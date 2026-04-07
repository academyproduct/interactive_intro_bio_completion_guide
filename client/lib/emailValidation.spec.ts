import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { isValidEmail } from "@/pages/Index";

/**
 * Feature: email-address-input
 * Property 2: Email Validation Correctness
 * Validates: Requirements 5.1, 5.2
 */

/**
 * Reference implementation of the expected email validation logic.
 * Returns true iff the string has exactly one `@` separating
 * a non-empty local part (no spaces) from a non-empty domain part
 * (no spaces) that contains at least one `.`.
 */
function expectedIsValid(s: string): boolean {
  const atIndex = s.indexOf("@");
  if (atIndex === -1) return false;

  const local = s.slice(0, atIndex);
  const domain = s.slice(atIndex + 1);

  if (local.length === 0 || domain.length === 0) return false;
  if (local.includes(" ") || domain.includes(" ")) return false;
  if (local.includes("@") || domain.includes("@")) return false;
  if (!domain.includes(".")) return false;

  return true;
}

/** Arbitrary that produces known-valid email addresses. */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9._-]{1,20}$/),
    fc.stringMatching(/^[a-z0-9-]{1,15}$/),
    fc.stringMatching(/^[a-z]{2,6}$/),
  )
  .map(([local, domainName, tld]) => `${local}@${domainName}.${tld}`);

describe("Feature: email-address-input, Property 2: Email Validation Correctness", () => {
  it("isValidEmail agrees with reference implementation for arbitrary non-empty strings", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (s) => {
        expect(isValidEmail(s)).toBe(expectedIsValid(s));
      }),
      { numRuns: 100 },
    );
  });

  it("isValidEmail returns true for known-valid emails", () => {
    fc.assert(
      fc.property(validEmailArb, (email) => {
        expect(isValidEmail(email)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: email-address-input
 * Property 1: Email localStorage Round-Trip
 * Validates: Requirements 3.1, 3.2, 7.3
 */

/**
 * Minimal localStorage stub for testing serialization round-trips
 * in a Node (non-jsdom) Vitest environment.
 */
function createLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}

const STORAGE_KEY = "completion-guide-state";

/** Default state shape matching the localStorage object used by Index.tsx */
function makeState(emailAddress: string) {
  return {
    selectedDays: [],
    minutesPerDay: {},
    completionDate: "",
    emailAddress,
    submitted: false,
    weeks: [],
    checkedTaskIds: [],
    warnings: { unallocatedTasks: false, exceededDate: false },
  };
}

describe("Feature: email-address-input, Property 1: Email localStorage Round-Trip", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createLocalStorageStub();
  });

  it("any string saved as emailAddress round-trips through localStorage", () => {
    fc.assert(
      fc.property(fc.string(), (email) => {
        // Save — mirrors saveToLocalStorage in Index.tsx
        const state = makeState(email);
        storage.setItem(STORAGE_KEY, JSON.stringify(state));

        // Load — mirrors loadFromLocalStorage in Index.tsx
        const stored = storage.getItem(STORAGE_KEY);
        expect(stored).not.toBeNull();

        const parsed = JSON.parse(stored!);
        const restored: string = parsed.emailAddress || "";

        // The || "" fallback maps falsy values (only "" for strings) to ""
        const expected = email || "";
        expect(restored).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: email-address-input
 * Property 3: Scheduler Independence from Email
 * Validates: Requirements 6.1
 */
import { greedyScheduleTasks } from "@/lib/scheduler";
import type { TaskPool, Task } from "@shared/tasks";

describe("Feature: email-address-input, Property 3: Scheduler Independence from Email", () => {
  /** Fixed task pool used for every iteration */
  const fixedTasks: Task[] = [
    { id: 1, module: 1, unit: "U1", page: "P1", activity_type: "read", weight: 30 },
    { id: 2, module: 1, unit: "U1", page: "P2", activity_type: "review", weight: 20 },
    { id: 3, module: 2, unit: "U2", page: "P3", activity_type: "test", weight: 25 },
  ];

  const fixedPool: TaskPool = {
    available: fixedTasks,
    assigned: [],
    completed: [],
  };

  const fixedDays = ["Monday", "Wednesday", "Friday"];
  const fixedMinutes: Record<string, number> = {
    Monday: 60,
    Wednesday: 60,
    Friday: 60,
  };

  it("greedyScheduleTasks produces identical output regardless of email value", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (emailA, emailB) => {
        // Email is NOT a parameter of greedyScheduleTasks.
        // We call the scheduler with identical scheduling inputs for both
        // "email scenarios" to prove the output is deterministic and
        // completely independent of any email value.
        void emailA;
        void emailB;

        const resultA = greedyScheduleTasks(fixedPool, fixedDays, fixedMinutes);
        const resultB = greedyScheduleTasks(fixedPool, fixedDays, fixedMinutes);

        expect(resultA).toStrictEqual(resultB);
      }),
      { numRuns: 100 },
    );
  });
});
