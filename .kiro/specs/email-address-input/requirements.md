# Requirements Document

## Introduction

Add an email address input field to the main completion-guide form in `client/pages/Index.tsx`, positioned beside the existing completion date input. The email value is persisted in localStorage alongside existing form state. The field is softly required with inline validation. When provided, the email is used as the xAPI actor identifier (via `mbox` IFI) so that xAPI statements can identify users by email. No backend changes or new external API calls are introduced.

## Glossary

- **Form**: The completion-guide form rendered by the `Index` component in `client/pages/Index.tsx`, containing the completion date input, weekday/time schedule, and Submit button.
- **Email_Input**: The new `<input type="email">` element added to the Form for capturing the user's email address.
- **Completion_Date_Input**: The existing `<input type="date">` element on the Form where the user selects a desired completion date.
- **LocalStorage_State**: The JSON object stored under the `completion-guide-state` key in the browser's localStorage, containing all persisted form state.
- **Soft_Nudge**: A lightweight, non-blocking inline message displayed near the Email_Input or Submit button encouraging the user to provide an email when the field is left blank.
- **Validation_Message**: A clear inline error message displayed near the Email_Input when the entered email value is malformed.
- **xAPI_Actor**: The `actor` field in each xAPI statement. When an email is provided, the actor uses a `mbox` mailto IFI; otherwise it falls back to an anonymous account-based identifier.
- **Scheduler**: The existing greedy scheduling algorithm and week-generation logic that produces the dynamic completion guide.

## Requirements

### Requirement 1: Email Input Field Rendering

**User Story:** As a user, I want to see an email input field beside the completion date input, so that I can provide my email address before generating the completion guide.

#### Acceptance Criteria

1. WHEN the Form renders, THE Form SHALL display the Email_Input beside the Completion_Date_Input in the same visual section.
2. THE Email_Input SHALL use `type="email"`, `autocomplete="email"`, and a placeholder value of `name@example.com`.
3. THE Email_Input SHALL have a visible label with the text `Enter your email address:`.
4. THE Email_Input SHALL have a programmatically associated `<label>` element using a `htmlFor`/`id` pair for accessibility.

### Requirement 2: Responsive Layout

**User Story:** As a user, I want the completion date and email fields to display side-by-side on larger screens and stack on smaller screens, so that the form is usable on any device.

#### Acceptance Criteria

1. WHILE the viewport width is at or above the Tailwind `sm` breakpoint (640px), THE Form SHALL render the Completion_Date_Input and Email_Input side-by-side in a single row.
2. WHILE the viewport width is below the Tailwind `sm` breakpoint, THE Form SHALL stack the Completion_Date_Input and Email_Input vertically.
3. THE Form SHALL use existing Tailwind utility classes consistent with the current styling patterns in `Index.tsx`.

### Requirement 3: LocalStorage Persistence

**User Story:** As a user, I want my email address to be saved and restored when I reload the page, so that I do not have to re-enter it.

#### Acceptance Criteria

1. WHEN the email state value changes, THE Form SHALL save the `emailAddress` field in the LocalStorage_State object alongside existing fields.
2. WHEN the page loads and LocalStorage_State contains an `emailAddress` field, THE Form SHALL restore the email state from the stored value.
3. WHEN the page loads and LocalStorage_State does not contain an `emailAddress` field, THE Form SHALL default the email state to an empty string without errors.

### Requirement 4: Soft Nudge for Blank Email

**User Story:** As a user, I want to receive a gentle reminder to provide my email if I leave the field blank, so that I am encouraged but not blocked from submitting.

#### Acceptance Criteria

1. WHEN the user clicks Submit and the Email_Input value is an empty string, THE Form SHALL allow submission to proceed.
2. WHEN the Email_Input value is an empty string at the time of submission or while the field is empty after the user has interacted with the form, THE Form SHALL display the Soft_Nudge near the Email_Input.
3. THE Soft_Nudge SHALL be a non-blocking inline text element that does not prevent form submission.

### Requirement 5: Malformed Email Validation

**User Story:** As a user, I want to see a clear error message if I enter an invalid email, so that I can correct it before submitting.

#### Acceptance Criteria

1. WHEN the user clicks Submit and the Email_Input contains a non-empty value that does not match a standard email format, THE Form SHALL display the Validation_Message near the Email_Input.
2. WHEN the Email_Input contains a malformed email value, THE Form SHALL prevent submission until the value is corrected to a valid email or cleared entirely.
3. THE Validation_Message SHALL be a visible inline text element with distinct styling (e.g., red text) to indicate an error state.

### Requirement 6: No Impact on Existing Scheduling Logic

**User Story:** As a user, I want the completion guide generation to work exactly as before, so that adding an email field does not change my schedule.

#### Acceptance Criteria

1. THE Scheduler SHALL produce identical week schedules for the same inputs (selected days, minutes per day, task pool) regardless of the Email_Input value.
2. THE Form SHALL preserve the existing `handleSubmit` scheduling logic, including greedy task allocation, warning calculations, and week generation, without modification.

### Requirement 7: xAPI Actor Identification via Email

**User Story:** As an administrator, I want xAPI statements to identify users by their email address when provided, so that I can track individual learner progress.

#### Acceptance Criteria

1. WHEN the Email_Input contains a valid, non-empty email address, THE xAPI module SHALL use the email as the xAPI_Actor via a `mbox` mailto IFI (e.g., `"mbox": "mailto:user@example.com"`).
2. WHEN the Email_Input is empty, THE xAPI module SHALL fall back to the existing anonymous account-based actor identifier.
3. THE Form SHALL sync the current email value to the xAPI module whenever the email state changes, so that all subsequent xAPI statements reflect the latest email.
4. THE Form SHALL store the `emailAddress` value in the browser's localStorage via the existing LocalStorage_State mechanism.

### Requirement 8: Consistent Styling

**User Story:** As a user, I want the email field to look like it belongs with the rest of the form, so that the UI feels cohesive.

#### Acceptance Criteria

1. THE Email_Input SHALL use the same border, padding, font, and rounding styles as the Completion_Date_Input.
2. THE Email_Input label SHALL use the same font weight, size, and color as the Completion_Date_Input label.
3. THE Soft_Nudge and Validation_Message SHALL use Tailwind utility classes consistent with the existing warning and text styles in the Form.

### Requirement 9: Vite Dev Server File Access

**User Story:** As a developer, I want the Vite dev server to serve the application without 403 errors, so that I can test locally.

#### Acceptance Criteria

1. THE Vite `server.fs.allow` configuration SHALL include the project root directory so that `index.html` (located at the project root) can be served during local development.
