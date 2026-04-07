/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Index from "@/pages/Index";
import { setActorEmail } from "@/lib/xapi";

// Mock xAPI modules to prevent real network calls
vi.mock("@/lib/xapiSend", () => ({
  sendXapiStatement: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/xapi", () => ({
  sendPageLoadXapi: vi.fn().mockResolvedValue(undefined),
  sendCheckboxXapi: vi.fn().mockResolvedValue(undefined),
  sendCompletionDateXapi: vi.fn().mockResolvedValue(undefined),
  sendScheduleDaySelectionXapi: vi.fn().mockResolvedValue(undefined),
  sendScheduleMinutesXapi: vi.fn().mockResolvedValue(undefined),
  setActorEmail: vi.fn(),
}));

// Minimal task data for fetch mock
const MOCK_TASKS = {
  Tasks: [
    { id: 0, module: 1, unit: "Unit 1", page: "Page 1", activity_type: "read", weight: 5 },
  ],
};

/**
 * Helper: renders the Index component after mocking fetch for /tasks.json
 * and waits for the initial data load to complete.
 */
async function renderIndex() {
  const result = render(<Index />);
  // Wait for the component to finish loading tasks
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });
  return result;
}

/**
 * Helper: fills in a valid completion date and selects at least one weekday
 * so the form passes the basic date/day validation checks.
 */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  // The date label lacks htmlFor, so query the input directly by type
  const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: "2099-12-31" } });

  // Click the "M" (Monday) weekday button to select a day
  const mondayButton = screen.getByRole("button", { name: "M" });
  await user.click(mondayButton);
}

describe("Task 5.3: Submit validation behavior", () => {
  let alertMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Mock window.alert (used for date/day validation errors)
    alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    // Mock scrollIntoView (not available in jsdom)
    Element.prototype.scrollIntoView = vi.fn();

    // Mock fetch to return task data
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(MOCK_TASKS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * Validates: Requirement 4.1
   * Submitting with blank email should proceed (not block).
   */
  it("submitting with blank email proceeds and generates schedule", async () => {
    const user = userEvent.setup();
    await renderIndex();
    await fillRequiredFields(user);

    // Leave email blank and click Submit
    const submitButton = screen.getByRole("button", { name: "Submit" });
    await user.click(submitButton);

    // The schedule should be generated — the submitted state shows week accordions
    await waitFor(() => {
      const weekHeadings = screen.getAllByText(/Week 1/i);
      expect(weekHeadings.length).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * Validates: Requirement 5.1
   * Submitting with malformed email should block submission.
   */
  it("submitting with malformed email blocks submission", async () => {
    const user = userEvent.setup();
    await renderIndex();
    await fillRequiredFields(user);

    // Type a malformed email
    const emailInput = screen.getByLabelText("Enter your email address:");
    await user.type(emailInput, "notanemail");

    // Click Submit
    const submitButton = screen.getByRole("button", { name: "Submit" });
    await user.click(submitButton);

    // Schedule should NOT be generated — "Week 1" should not appear
    expect(screen.queryByText(/Week 1/i)).not.toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.2
   * Soft nudge appears for blank email on submit.
   */
  it("shows soft nudge when submitting with blank email", async () => {
    const user = userEvent.setup();
    await renderIndex();
    await fillRequiredFields(user);

    // Leave email blank and click Submit
    const submitButton = screen.getByRole("button", { name: "Submit" });
    await user.click(submitButton);

    // The soft nudge message should appear
    await waitFor(() => {
      expect(screen.getByText("Providing an email is recommended.")).toBeInTheDocument();
    });
  });

  /**
   * Validates: Requirement 5.3
   * Validation error appears for malformed email.
   */
  it("shows validation error for malformed email", async () => {
    const user = userEvent.setup();
    await renderIndex();

    // Type a malformed email
    const emailInput = screen.getByLabelText("Enter your email address:");
    await user.type(emailInput, "bad-email");

    // The validation error should appear inline (shown reactively when non-empty and invalid)
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
  });
});

describe("Task 6.2: Email included in xAPI actor", () => {
  let alertMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(MOCK_TASKS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * After filling in an email and submitting, the setActorEmail function
   * should have been called with the email so xAPI statements use it as actor.
   */
  it("sets the email as xAPI actor identifier via setActorEmail", async () => {
    const user = userEvent.setup();
    await renderIndex();
    await fillRequiredFields(user);

    const testEmail = "test@example.com";

    // Type a valid email address
    const emailInput = screen.getByLabelText("Enter your email address:");
    await user.type(emailInput, testEmail);

    // Verify setActorEmail was called with the email
    expect(setActorEmail).toHaveBeenCalledWith(testEmail);
  });
});
