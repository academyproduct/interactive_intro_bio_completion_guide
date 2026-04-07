# Implementation Plan: Email Address Input

## Overview

Add an email address input field to the existing completion-guide form in `client/pages/Index.tsx`. All changes are scoped to this single file (plus test files). The implementation adds state, layout restructuring, validation, localStorage persistence, and inline messaging — without touching scheduling logic or xAPI.

## Tasks

- [x] 1. Add email state and validation helper
  - [x] 1.1 Add `emailAddress` state and `isValidEmail` helper to `Index.tsx`
    - Add `const [emailAddress, setEmailAddress] = useState<string>("")` alongside existing state declarations
    - Add the `isValidEmail` helper function using the regex from the design: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
    - _Requirements: 1.2, 5.1, 5.2_

  - [x] 1.2 Write property test for email validation correctness
    - **Property 2: Email Validation Correctness**
    - Generate arbitrary non-empty strings via `fc.string({ minLength: 1 })` and verify `isValidEmail` returns `true` only when the string has `@` separating non-empty local/domain parts (no spaces) with domain containing `.`
    - Also generate known-valid emails via a custom arbitrary and verify they pass
    - Create test file at `client/lib/emailValidation.spec.ts`
    - **Validates: Requirements 5.1, 5.2**

- [x] 2. Restructure layout and render email input
  - [x] 2.1 Restructure the completion date section to a responsive two-column layout
    - Replace the `max-w-[262px]` wrapper with a `flex flex-col sm:flex-row items-start justify-center gap-4 w-full max-w-[600px]` container
    - Wrap the existing completion date input in its own `w-full sm:w-auto flex flex-col gap-1.5` column
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Add the email input field in the second column
    - Add a `<label htmlFor="email-input">` with text `Enter your email address:` using the same styling as the date label (`text-center text-black text-base font-bold font-lato`)
    - Add `<input id="email-input" type="email" autoComplete="email" placeholder="name@example.com">` with the same styling as the date input (`w-full px-4 py-3 text-center border-[1.4px] border-black/30 rounded text-lg`)
    - Wire `value={emailAddress}` and `onChange={(e) => setEmailAddress(e.target.value)}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2_

- [x] 3. Update localStorage save/load for email persistence
  - [x] 3.1 Update `saveToLocalStorage` to include `emailAddress` in the serialized state object
    - Add `emailAddress` to the state object passed to `JSON.stringify`
    - _Requirements: 3.1, 7.3_

  - [x] 3.2 Update `loadFromLocalStorage` to restore `emailAddress` from stored state
    - Add `setEmailAddress(state.emailAddress || "")` to handle both existing and missing field cases
    - _Requirements: 3.2, 3.3_

  - [x] 3.3 Add `emailAddress` to the `useEffect` dependency array that triggers `saveToLocalStorage`
    - _Requirements: 3.1_

  - [x] 3.4 Write property test for email localStorage round-trip
    - **Property 1: Email localStorage Round-Trip**
    - Generate arbitrary strings via `fc.string()`, save to localStorage state object, load back, assert equality
    - Create test in `client/lib/emailValidation.spec.ts`
    - **Validates: Requirements 3.1, 3.2, 7.3**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add validation gating and inline messages
  - [x] 5.1 Add email validation gate to `handleSubmit`
    - After existing date/day checks and before scheduling logic, add: if `emailAddress.trim()` is non-empty and `!isValidEmail(emailAddress.trim())`, return early (block submit)
    - _Requirements: 5.1, 5.2, 4.1_

  - [x] 5.2 Add inline soft nudge and validation error messages below the email input
    - Show amber nudge text `"Providing an email is recommended."` when email is blank after submit or after user interaction (`text-sm text-amber-600 font-lato`)
    - Show red validation error `"Please enter a valid email address."` when email is non-empty and malformed (`text-sm text-red-600 font-lato`)
    - Track whether the user has attempted submission or interacted with the field to control nudge visibility
    - _Requirements: 4.2, 4.3, 5.3, 8.3_

  - [x] 5.3 Write unit tests for submit validation behavior
    - Test that submitting with blank email proceeds (does not block)
    - Test that submitting with malformed email blocks submission
    - Test that soft nudge appears for blank email on submit
    - Test that validation error appears for malformed email
    - Create test in `client/pages/Index.spec.tsx`
    - _Requirements: 4.1, 4.2, 5.1, 5.3_

- [x] 6. Verify scheduler independence and privacy constraints
  - [x] 6.1 Write property test for scheduler independence from email
    - **Property 3: Scheduler Independence from Email**
    - Generate two arbitrary email strings and fixed scheduling inputs, run `greedyScheduleTasks` for both, assert deep equality of output
    - Create test in `client/lib/emailValidation.spec.ts`
    - **Validates: Requirements 6.1**

  - [x] 6.2 Write unit test verifying email is excluded from xAPI
    - Mock xAPI send functions, interact with form, verify no statement payload contains the email value
    - Create test in `client/pages/Index.spec.tsx`
    - _Requirements: 7.1, 7.2_

- [x] 7. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All implementation changes are in `client/pages/Index.tsx` — no new components or modules
- Test files: `client/lib/emailValidation.spec.ts` (validation + PBT) and `client/pages/Index.spec.tsx` (component tests)
- Property tests use Vitest + fast-check with minimum 100 iterations
- Each task references specific requirements for traceability
