# AGSB — Issues Found (Full-Site Audit)

**Date:** 2026-10-03
**Branch:** `stage` (all three repos)
**Scope:** `agsb-backend` (Express + MongoDB), `agsb-admin` (React admin panel), `agsb` (React public site)


# Second audit (after fixes 1-56)

**Date:** 2026-10-03. Code review of all three repos, focused on regressions from the fix commits plus anything missed the first time. The admin app was also exercised in Chromium against a mocked API. Lint and build pass in both frontends.

## High

### 57.-done Seats can still be held without paying (#6 is bypassable)
- **Where:** `BE` bookingController.js:163-169 (caps count only `paymentStatus: 'unpaid'`), :309-320 (`submitPayment` unsets `holdExpiresAt`), :87-91 (sweep expires only `unpaid`), :357-379 (`updatePaymentStatus` never sets a new hold)
- **Verified:** Code
- **Problem:**
  - After payment submission a booking is `pending_verification`: no expiry, and it no longer counts toward `MAX_UNPAID_PER_PLAN` / `MAX_UNPAID_TOTAL`.
  - The TrxID check accepts any 6-30 letters/digits.
  - When the admin rejects (`failed`) or resets to `unpaid`, the booking stays `pending` with its seats and no `holdExpiresAt`, so the sweep never releases it.
  - The cap checks are count-then-insert, so parallel requests can all pass.
- **Effect:** One free account can loop "book 10 seats, submit fake TrxID" and fill any plan in minutes. Rejected bookings hold their seats until cancelled by hand.
- **Fix:** Count `unpaid`, `pending_verification` and `failed` pending bookings toward both caps. When the admin sets `failed` or `unpaid`, set a fresh `holdExpiresAt` and let the sweep expire `failed` as well as `unpaid` (or cancel automatically on reject).

## Medium

### 58.-done Editing a plan overwrites the live seat count
- **Where:** `BE` planController.js:57, 88, 104 · `AD` Plans.jsx:33, 62-71
- **Verified:** Code
- **Problem:** `seats_available` is decremented atomically by bookings, but the admin edit form sends back the value it loaded and the edit `$set`s it.
- **Effect:** Seats booked while the form was open are given back, so the plan oversells. Adding seats to a `full` plan leaves it `full` (unbookable). Switching from unlimited to limited seats ignores existing bookings.
- **Fix:** Write `seats_available` only when the admin changed it (send the loaded value and apply the difference with `$inc`), and set `full` back to `open` when seats go above 0.

### 59.-done Users can pay after their seat hold has expired
- **Where:** `WEB` src/lib/booking.js:46-61 (`canPay`, `isHoldExpired`, `holdDeadline`), PaymentPage.jsx:27-28, 88, CheckoutPage.jsx:91, 154-156
- **Verified:** Code
- **Problem:** The site treats a booking as expired only once the backend sweep has cancelled it (`cancelReason === 'expired'`); it never compares `holdExpiresAt` with the current time, and the pay page is never refetched. The sweep runs every 5 minutes.
- **Effect:** A user who sends bKash money after the deadline gets 409 "Your seat hold expired", the booking is cancelled, and the money has already been sent. The page still says "Complete payment by <past time>".
- **Fix:** Treat `holdExpiresAt < now` as expired on the client, show a live countdown, refetch on window focus, and reload the booking on a 409.

### 60.-done Premium frames are locked only in the browser
- **Where:** `WEB` FramesPage.jsx:14-17, 78, 138 · `BE` frameController.js:11-14
- **Verified:** Code
- **Problem:** `GET /frames` is public and returns every frame's full image URL, and the card renders it. The lock is only a button redirect, and `hasPremium` reads `user.plan` from localStorage.
- **Effect:** Anyone can save premium frames with right-click, or by editing `plan` in localStorage.
- **Fix:** Return only a watermarked or low-res preview for premium frames from the public endpoint, and serve the original from an authenticated endpoint that checks the plan in the database.

### 61.-done Rate limits treat every visitor as one IP behind a reverse proxy
- **Where:** `BE` src/middleware/rateLimit.js:17 · index.js (no `trust proxy`) · authRoutes.js:7-9 · contactRoutes.js:7
- **Verified:** Code
- **Problem:** Behind nginx or a PaaS router `req.ip` is the proxy's address. Successful logins also count toward the limit.
- **Effect:** 10 logins in 15 minutes from anyone returns 429 for every user and for admin login; same for signup (5/hour) and contact (5/10 min). Mobile-carrier CGNAT causes a milder version without a proxy.
- **Fix:** Set `trust proxy` from a `TRUST_PROXY` env var (hop count or subnet, never `true`), document it in `.env.example`, and don't count successful logins.

### 62.-done A failed database connection at startup does not exit with an error
- **Where:** `BE` index.js:167-169
- **Verified:** Code
- **Problem:** `run()` catches the startup error and only logs it.
- **Effect:** If MongoDB is unreachable at boot nothing listens and the process exits with code 0, so supervisors that restart on failure leave the API down.
- **Fix:** `process.exit(1)` in that catch.

## Low

### 63.-done Admin payment update can confirm a booking the sweep just cancelled
- **Where:** `BE` bookingController.js:365-379
- **Verified:** Code
- **Problem:** `updatePaymentStatus` reads the booking, then writes with an unconditional `updateOne({ _id })` that may set `bookingStatus: 'confirmed'`.
- **Effect:** If the hold expires at the same moment, the sweep releases the seats and the admin's write re-confirms the booking, so the plan oversells.
- **Fix:** Include the read `bookingStatus` (or `{ $ne: 'cancelled' }` when confirming) in the filter and return 409 when nothing was modified.

### 64.-done Booking status check and seat reservation use different rules
- **Where:** `BE` bookingController.js:149 vs. :67/178
- **Verified:** Code
- **Problem:** The pre-check uses `(plan.status || 'open') !== 'open'`; the reservation uses `{ $in: ['open', null] }`.
- **Effect:** For a legacy plan with `status: ''`, or one closed between read and update, the user gets a wrong "Only N seats left" / "fully booked" message.
- **Fix:** Use one rule in both places and re-check status before choosing the failure message.

### 65.-done Re-running seedAdmin does not revoke admin sessions
- **Where:** `BE` src/scripts/seedAdmin.js:19-23
- **Verified:** Code
- **Problem:** A password reset `$set`s the hash but doesn't bump `tokenVersion`, so a stolen admin token stays valid up to 12 h. The upsert filter has no collation, so a differently capitalised `ADMIN_EMAIL` tries to insert a duplicate and fails on the unique index.
- **Fix:** Add `$inc: { tokenVersion: 1 }` and `collation: { locale: 'en', strength: 2 }`.

### 66.-done `toPublicUrl` cuts external URLs that contain "/uploads"
- **Where:** `BE` src/utils/paths.js:4-5 (used by every GET and crud.js:36, 56)
- **Verified:** Code
- **Problem:** `https://cdn.example.com/wp-content/uploads/x.jpg` becomes `/uploads/x.jpg`.
- **Effect:** Broken image; on edit/delete `removeUpload` may delete an unrelated local file with the same name (still inside `uploads/`).
- **Fix:** Leave `http(s)://` values untouched.

### 67.-done Check-ins on districts outside the 64 map slugs break the profile tracker
- **Where:** `WEB` DistrictDetailPage.jsx:218-226, ProfilePage.jsx:62-65, 106, 184-186, MapPage.jsx:54 · `BE` districtController.js:10
- **Verified:** Code
- **Problem:** `CheckIn` saves whatever slug the district has. The profile count uses `visited.length` but the badges and map only show slugs in `ALL_DISTRICTS` (which keeps the old `chittagong` / `comilla` slugs). The backend doesn't validate district slugs.
- **Effect:** A district created with slug `chattogram` has no marker; its check-in counts but never shows, and the count can reach 65/64. A slug with capitals or spaces fails every check-in with 400.
- **Fix:** Count only known slugs, hide `CheckIn` for unknown slugs, and validate district slugs on the backend (`/^[a-z0-9-]{1,60}$/`).

### 68.-done Trips that have already started still show "Booking open"
- **Where:** `WEB` src/lib/planSchedule.js:9-16 (used by PlanDetailPage.jsx:67, 150 and BookingPage.jsx:55)
- **Verified:** Code
- **Problem:** `isBookable` / `planStatus` ignore `start_date`, but the backend now rejects started trips (#40).
- **Effect:** The user fills in up to 10 traveller forms, then gets 409 "This trip has already started".
- **Fix:** Treat a `start_date` before today (Dhaka time) as closed, matching the backend's `hasStarted`.

### 69.-done Startup profile refresh can overwrite a fresh check-in
- **Where:** `WEB` src/context/AuthContext.jsx:33-38
- **Verified:** Code
- **Problem:** The startup `GET /profile` calls `setUser` unconditionally when it resolves.
- **Effect:** On a slow network a check-in made before it returns disappears from the UI, and the next toggle builds on the stale list so the server loses it too.
- **Fix:** Ignore the startup response if `updateUser` ran since it was sent, or merge instead of replace.

### 70.-done `?division=` filter shows "no districts found" while divisions load
- **Where:** `WEB` DistrictsPage.jsx:26, 33-37, 86-93
- **Verified:** Code
- **Problem:** Filtering needs the divisions list, but only the districts request's loading/error state is used.
- **Effect:** `/districts?division=sylhet` shows "0 districts found" until divisions load, and permanently if that request fails.
- **Fix:** Include the divisions request in the loading and error state when a division filter is active.

### 71.-done Admin lists don't refresh when the current page is clicked in the sidebar
- **Where:** `AD` every CRUD page's `useState(() => asArray(initial))` (e.g. Divisions.jsx:15, Plans.jsx:43), usePagedList.js:38
- **Verified:** Runtime (mocked API)
- **Problem:** React Router re-runs the loader on a same-route navigation but the page keeps its old state.
- **Effect:** New bookings or edits made elsewhere don't appear until a full reload.
- **Fix:** Key the page on `location.key`, or sync state when `useLoaderData()` changes.

### 72.-done Esc closes admin forms without asking
- **Where:** `AD` src/components/Modal.jsx:24-28
- **Verified:** Runtime (mocked API)
- **Problem:** Esc closes Add/Edit forms with no "discard changes?" prompt, even while saving. Keydown inside the editor iframe doesn't reach the dialog, so Esc works inconsistently.
- **Effect:** An admin can lose a long blog or plan draft.
- **Fix:** Confirm before closing a dirty form and ignore Esc while submitting; optionally forward Esc from the editor iframe.

### 73.-done Membership features containing a comma are split on every edit
- **Where:** `AD` Membership.jsx:12, 33 · `BE` membershipController.js:7-9
- **Verified:** Code
- **Problem:** Features are joined with `", "` for editing and split on `","` when saved.
- **Effect:** "Up to ৳1,000 discount" becomes "Up to ৳1" and "000 discount".
- **Fix:** Edit one feature per line (split on `\n`) or as an array field like Plans' highlights.

### 74.-done Rich-text toolbar can't be used from the keyboard
- **Where:** `AD` RichTextEditor.jsx:455-457 (`Btn`), 557-558, 565-566, 576-577
- **Verified:** Code
- **Problem:** Toolbar buttons only handle `onMouseDown`; Enter/Space fire `click`, which has no handler.
- **Fix:** Add `onClick` running the command, keeping `onMouseDown={(e) => e.preventDefault()}` to preserve the selection.

### 75.-done Login errors aren't announced to screen readers
- **Where:** `AD` src/Layout/Auth/Login.jsx:88
- **Verified:** Code
- **Problem:** The error alert has no `role="alert"` / `aria-live`.
- **Fix:** Add `role="alert"` and reference it from the inputs with `aria-describedby`.

---

## Appendix: stage test environment

- **Database:** `agsb_stage` on the same Atlas cluster as production data (`clustercc`). The real `agsb` database was not modified.
- **Stage admin:** `stage-admin@amighurechi.test`. Its password is not stored in the repo; re-seed with `MONGO_DB_NAME=agsb_stage ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin`.
- **Run the stage backend:** `PORT=5002 MONGO_DB_NAME=agsb_stage node index.js`.
- **Test user:** `stage-user1@amighurechi.test`.
- **Data created through the admin UI:**

  | Collection | Count |
  |---|---|
  | divisions | 8 |
  | districts | 13 |
  | blog posts | 4 |
  | travel plans | 5 |
  | partners | 4 |
  | frames | 3 |
  | membership plans | 3 |
  | hotels | 5 |
  | transports | 5 |
  | guides | 3 |
  | district agents | 4 |
  | checkpoints | 4 |
  | payment methods | 4 |

- **Data created through the public site:** 3 bookings (one paid and confirmed, one pending, one cancelled), 1 contact message and 1 user.
- **Uploads:** test images were written to `agsb-backend/uploads/` (gitignored).
