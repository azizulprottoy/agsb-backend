# AGSB — Issues Found (Full-Site Audit)

**Date:** 2026-10-03
**Branch:** `stage` (all three repos)
**Scope:** `agsb-backend` (Express + MongoDB), `agsb-admin` (React admin panel), `agsb` (React public site)

## How this was produced

1. **Code review** of every file in all three repos, cross-checking frontend API calls against backend routes and controllers. Lint and build were run for both frontends.
2. **Runtime testing.** A separate stage backend (port 5002, MongoDB database `agsb_stage`) was filled with realistic data by driving the **real admin panel UI** in a headless browser. The public-site flows were then tested end to end: signup, booking, payment submission, contact form, profile check-ins, and the admin's handling of bookings and messages. The real `agsb` database was not touched.

**Verified** column:
- **Runtime**: reproduced in the running app.
- **Code**: confirmed by reading the code, not reproduced.

Paths are relative to each repo root. `BE` = agsb-backend, `AD` = agsb-admin, `WEB` = agsb.

---

## Critical

### 1.-done Admin cannot add Districts, Partners or Frames
- **Where:** `AD` src/Layout/Districts/Districts.jsx:100, 213 · src/Layout/Partners/Partners.jsx:72, 123 · src/Layout/Frames/Frames.jsx:70, 89
- **Severity / Verified:** Critical / Runtime
- **Problem:** `const Form = (...) => ...` is defined *inside* the page component and rendered as `<Form/>`. Each state change creates a new component type, so React remounts the whole form. The remount empties the `required` file input right after a file is chosen; the preview still shows the image.
- **Effect:** Submit is blocked with "Please select a file". None of these three entity types can be created through the UI.
- **Fix:** Move `Form` to module scope and pass `form`, `setForm` and `file` as props. Alternatively, call it as a function (`{Form({...})}`), as `Blog.jsx` and `Plans.jsx` already do.

## High

### 2.-done Admin inputs lose focus after every keystroke (10 pages)
- **Where:** `AD` Divisions.jsx:58, Districts.jsx:100, Partners.jsx:72, Frames.jsx:70, Membership.jsx:65, Hotels.jsx:93, Transport.jsx:79, Guides.jsx:102, DistrictAgents.jsx:74, Checkpoints.jsx:82 (all under src/Layout/<Name>/)
- **Severity / Verified:** High / Runtime
- **Problem:** Same root cause as #1. Typing "Abc" leaves only "A", and focus jumps to `<body>`.
- **Effect:** Every add or edit form on these pages needs a click back into the field after each character, which makes data entry painfully slow.
- **Fix:** Same as #1. Blog, Plans and PaymentMethods are not affected.

### 3.-done Site cannot be deployed: API URLs and CORS are hard-coded to localhost
- **Where:** `BE` src/config/constants.js:3-9 · `AD` src/config/config.js:1 · `WEB` src/lib/config.js:1
- **Severity / Verified:** High / Code
- **Problem:**
  - The backend CORS allow-list contains only `localhost` / `127.0.0.1` origins.
  - The admin API URL is hard-coded to `http://localhost:5001/api`.
  - The site falls back to that same URL when `VITE_API_BASE_URL` is missing, and the repo has no `.env`.
  - The backend `.env.example` uses port 5000, but both frontends expect 5001.
- **Effect:** Any deployed frontend is blocked by CORS or calls localhost, so every page renders empty. A fresh dev setup that follows `.env.example` cannot reach the API either.
- **Fix:**
  - Backend: read `CORS_ORIGINS` from env as a comma-separated list and drop `credentials: true`, which isn't needed for Bearer auth.
  - Both frontends: use `import.meta.env.VITE_API_URL` and fail the build when it is missing.
  - Add `.env.example` files to both frontends and align the port.

### 4.-done One database error can crash the whole API
- **Where:** `BE` the list and by-slug handlers in almost every controller, e.g. blogController.js:17, 22 · districtController.js:33, 38 · planController.js:59, 64 · bookingController.js:138, 143, 212 · contactController.js:30, plus the `getX` handlers of division, frame, guide, hotel, partner, transport, checkpoint, districtAgent, membership and paymentMethod
- **Severity / Verified:** High / Code
- **Problem:** These async handlers have no try/catch. Express 4 does not forward rejected promises to its error handling. On Node 24, an unhandled rejection terminates the process.
- **Effect:** A brief MongoDB hiccup during `GET /api/plans` takes the whole API down until it is restarted manually.
- **Fix:** Wrap the handlers in an `asyncHandler` (or upgrade to Express 5). Add a final JSON error middleware and a `process.on('unhandledRejection')` logger, and run under a process manager.

### 5.-done Login can be probed with NoSQL injection, reveals which emails exist, and has no rate limit
- **Where:** `BE` src/controllers/authController.js:14, 50, 96
- **Severity / Verified:** High / Code
- **Problem:**
  - `email` from the request body goes straight into `findOne({ email })` with no type check, so `{"$regex":"^a"}` is accepted.
  - Login answers **404 "Admin not found" / "User not found"** for an unknown email and **401 "Invalid password"** for a wrong password.
  - There is no rate limiting.
- **Effect:** An attacker can recover the admin email character by character, then brute-force the password.
- **Fix:**
  - Reject a non-string `email`, then trim and lowercase it.
  - Return a single generic `401 Invalid credentials` for both cases.
  - Add `express-rate-limit` to `/api/auth/*`.

### 6.-done Seats can be hoarded with unpaid bookings
- **Where:** `BE` src/controllers/bookingController.js:79-91, 97-121
- **Severity / Verified:** High / Code
- **Problem:** Seats are deducted as soon as a booking is created. Unpaid bookings never expire, and there is no per-user limit.
- **Effect:** Anyone can sign up for free and book 10 tickets at a time until a plan shows "Fully booked", without paying. Runtime testing confirmed that a 2-seat plan flips to full immediately on an unpaid booking.
- **Fix:**
  - Store an expiry on unpaid holds and release their seats with a scheduled sweep (or sweep before each booking).
  - Cap pending bookings and tickets per user per plan.

### 7.-done Admin can cancel a booking, or downgrade a payment, by mis-clicking a dropdown
- **Where:** `AD` src/Layout/Bookings/Bookings.jsx:96 (payment status), :102 (booking status)
- **Severity / Verified:** High / Runtime
- **Problem:** Changing either `<select>` fires the PATCH immediately, with no confirmation.
- **Effect:**
  - Choosing "Cancelled" cancels at once and releases the seats (16 → 17 in testing). The select then becomes disabled, and the backend refuses to reopen the booking, so the cancellation is permanent.
  - Changing payment from `paid_full` to `unpaid` resets `paidAmount` to 0.
- **Fix:** Ask for confirmation before cancelling and before any payment downgrade.

### 8.-done Public site still shows the user as logged in after their token becomes invalid
- **Where:** `WEB` src/context/AuthContext.jsx:37-41
- **Severity / Verified:** High / Runtime
- **Problem:** When the start-up `/profile` check fails, the token is removed from storage but `setUser(null)` is never called. The same catch also logs the user out on *any* error, including network errors and 500s.
- **Effect:**
  - With an expired token, the navbar still shows the profile avatar and protected booking pages still open. Every member API call then fails with "No token provided", and the user sees "Booking not found" or "No bookings yet".
  - Separately, a brief backend outage at page load logs the user out.
- **Fix:** Call `setUser(null)` in the catch, but only clear the session on a 401. Have `apiGet` attach `res.status` to the error it throws.

### 9.-done Neither frontend handles 401 / expired tokens mid-session
- **Where:** `WEB` src/lib/api.js:26-44 · `AD` src/utils/api.js:8-26, src/Provider/AuthProvider.jsx:11-27
- **Severity / Verified:** High / Code
- **Problem:** Neither app checks for a 401 after start-up.
  - **Admin:** the token's `exp` is checked only on mount and no logout timer is set (admin tokens last 12 h). The 401 branch of `authFetch` clears storage but leaves `user` in context.
  - **Site:** the user is never redirected to `/login`.
- **Effect:** After the token expires, deletes, status changes and member pages fail silently or show misleading errors.
- **Fix:** Use one fetch helper per app. On a 401: clear auth, update context, and redirect to `/login` (on the site, pass `state.from`). On the admin, also schedule `logout` at `exp`.

### 10.-done Public site can white-screen on missing or malformed data
- **Where:** `WEB` src/App.jsx (no error boundary), plus these unguarded accesses:

  | File:line | Access |
  |---|---|
  | DistrictDetailPage.jsx:20 | `p.districts.includes` |
  | DistrictDetailPage.jsx:66 | `district.attractions.map` |
  | DistrictDetailPage.jsx:87 | `district.food.map` |
  | MapPage.jsx:153 | `selected.attractions.slice` |
  | HomePage.jsx:151 | `p.districts.join` |
  | PlansPage.jsx:32 | `p.districts.join` |
  | PlansPage.jsx:44 | `p.highlights.map` |
  | DistrictsPage.jsx:17 | `d.name_en.toLowerCase()` |
  | CheckoutPage.jsx:74 | `booking.travellers.map` |

- **Severity / Verified:** High / Code
- **Problem:** The backend's `parseJsonField` can return a non-array, and older or hand-edited documents may lack these fields.
- **Effect:** Any single bad record blanks the entire app.
- **Fix:** Add a route-level `ErrorBoundary`, and guard these accesses with `?.` and `|| []`.

### 11. File uploads have no type or size restriction and are served from the API origin
- **Where:** `BE` src/middleware/upload.js:13-28 · index.js:49
- **Severity / Verified:** High / Code
- **Problem:** There is no multer `fileFilter` and no `limits`. The file extension is taken from the uploaded filename, and `express.static` serves the files from the API origin.
- **Effect:**
  - An `.html` or `.svg` uploaded through an admin token (for example via `/api/uploadrichtextimage`) is served as an active page on the API origin, which is stored XSS.
  - A multi-GB upload can fill the disk.
- **Fix:**
  - Allow only jpeg/png/webp/gif, by both MIME type and extension, and derive the extension from the detected type.
  - Set `limits: { fileSize: 5 * 1024 * 1024, files: 1 }`.
  - Serve `/uploads` with `X-Content-Type-Options: nosniff`.

## Medium

### 12. Edit (PUT) endpoints rebuild the entire document
- **Where:** `BE` the `buildXData` function used by every `editX`, e.g. planController.js:40-56, blogController.js:4-14, districtController.js:14-30, hotelController.js:14-24, membershipController.js:33-43
- **Severity / Verified:** Medium / Code. It did **not** reproduce through the admin UI, because the admin forms always send every field.
- **Problem:** Any field missing from the request body becomes `null` or goes back to its default.
- **Effect:** A partial update from another client or a future form can:
  - reopen a full, closed or cancelled trip (`status` resets to `'open'`);
  - remove the seat cap (`seats_available` becomes `null`);
  - re-date a blog post to today.
- **Fix:** For PUT, build `$set` only from the fields that are present (as `profileController` already does), or validate the full payload and return 400.

### 13. Bad IDs return 500, and missing records return success
- **Where:** `BE` every edit/delete `new ObjectId(req.params.id)` (e.g. blogController.js:51, 61), every `new ObjectId(body.district_id …)`, and the guide `district_ids.map`
- **Severity / Verified:** Medium / Code
- **Effect:**
  - `PUT /api/hotels/abc` returns 500.
  - Updating a deleted record still returns "updated successfully".
  - Deletes return the raw `DeleteResult`.
- **Fix:** Validate IDs with `ObjectId.isValid` and return 400. Check `matchedCount` / `deletedCount` and return 404. Ensure array fields really are arrays.

### 14. No database indexes, so nothing is actually unique
- **Where:** `BE` src/config/db.js (no `createIndex` anywhere) · authController.js:50-68 · src/utils/refCode.js:11-16 · bookingController.js:179
- **Severity / Verified:** Medium / Code
- **Problem:** Uniqueness is enforced only by find-then-insert, which can race. Lookups are full collection scans.
- **Effect:**
  - Two simultaneous signups can create duplicate accounts.
  - A duplicate slug makes `/plans/:slug` (or `/districts/:slug`, `/blog/:slug`) return an arbitrary record.
  - Duplicate booking reference codes or transaction IDs are possible.
- **Fix:**
  - At startup, create unique indexes on: `users.email`, `admins.email`, `slug` (divisions, districts, travelplans, blogposts), and `bookings.referenceCode`.
  - Add a unique partial index on `bookings.payment.transactionId`, and a regular index on `bookings.userId`.
  - Catch duplicate-key error 11000 and return 409.
  - In the admin forms, validate slugs with `pattern="[a-z0-9-]+"` and auto-generate them from the English name.

### 15. Email addresses are case-sensitive
- **Where:** `BE` authController.js · `WEB` src/pages/SignupPage.jsx:18-35, LoginPage.jsx:16-25
- **Severity / Verified:** Medium / Code
- **Effect:** `User@x.com` and `user@x.com` become two separate accounts, and logging in with a different casing fails.
- **Fix:** Trim and lowercase the email on both client and server, and back it with the unique index from #14.

### 16. No global error handler or 404 handler, so HTML stack traces leak
- **Where:** `BE` index.js
- **Severity / Verified:** Medium / Code
- **Problem:** `NODE_ENV` is never set. Malformed JSON, or a multer `LIMIT_UNEXPECTED_FILE`, falls through to Express's default handler.
- **Effect:** The response is an HTML stack trace that includes server paths. Frontends that expect JSON break on it (see #30).
- **Fix:** Add a JSON error middleware and a JSON 404 handler, and set `NODE_ENV=production` in deployment.

### 17. Contact form can be spammed and accepts double submits
- **Where:** `BE` src/controllers/contactController.js:4-28 · `WEB` src/pages/ContactPage.jsx:13-22
- **Severity / Verified:** Medium / Code
- **Problem:**
  - Backend: no rate limit, no type or length checks, and the phone number is not validated.
  - Site: no submitting state.
- **Effect:**
  - A script can flood the admin inbox, and `GET /contact` returns every message unpaginated.
  - A double click creates duplicate messages.
- **Fix:**
  - Backend: add a rate limit, coerce fields with `String()`, cap their lengths, and validate the phone with the existing `BD_PHONE` regex.
  - Site: disable the submit button while the request is in flight.

### 18. Cancelling a booking twice releases its seats twice
- **Where:** `BE` bookingController.js:253-265
- **Severity / Verified:** Medium / Code
- **Problem:** Cancellation reads the booking, updates it without a condition, then releases the seats.
- **Effect:** Two concurrent cancels (a double click, or two admins) push seat inventory above capacity.
- **Fix:** Update with `{ _id, bookingStatus: { $ne: 'cancelled' } }`, and release seats only when `modifiedCount === 1`.

### 19. No pagination anywhere
- **Where:** `BE` every `find().toArray()` (notably userController.js:4, bookingController.js:213, contactController.js:31) · `AD` every list page
- **Severity / Verified:** Medium / Code
- **Effect:** As the data grows, admin pages load entire collections into memory, and the responses carry every user's personal data at once. There is also no search.
- **Fix:** Add `?page=&limit=` with a maximum, use projections, and add pagination and search to the admin lists.

### 20. Rich-text HTML is stored unsanitized and executed inside the admin editor
- **Where:** `AD` src/components/RichTextEditor.jsx:47-120 · `BE` blogController.js:10, planController.js:50-51
- **Severity / Verified:** Medium / Code
- **Problem:** The backend stores HTML as-is. The editor writes it with `doc.write` into an unsandboxed `about:blank` iframe, which shares the admin panel's origin. (The public site is safe: it sanitizes with DOMPurify.)
- **Effect:** A post containing `<img src=x onerror=...>` runs code when any admin opens Edit, and that code can read `localStorage.adminToken`.
- **Fix:** Sanitize on the server (e.g. `sanitize-html`) and run DOMPurify before writing into the editor.

### 21. Admin pages crash on a 403/500 or when the backend is down
- **Where:** `AD` src/routes/Routes.jsx:23-34, 36-161 · Users.jsx:4 · Contact.jsx:9 · Divisions.jsx:10 · Membership.jsx:12
- **Severity / Verified:** Medium / Code
- **Problem:** There is no `errorElement` and no catch-all route. Loaders pass error JSON straight to the page.
- **Effect:** The page shows React Router's "Unexpected Application Error", or crashes with `rows.map is not a function`.
- **Fix:** Add an `errorElement` and a 404 route, throw on `!res.ok`, and guard with `Array.isArray`, as Bookings and PaymentMethods already do.

### 22. Admin actions fail silently
- **Where:** `AD` src/utils/api.js:8-26 · every `handleDelete` (e.g. Divisions.jsx:52, Contact.jsx:23) · Contact.jsx:12-17
- **Severity / Verified:** Medium / Code
- **Problem:** `res.ok` is never checked, and `res.json()` runs without a try/catch. Handlers only act on success and have no `else` branch.
- **Effect:** A failed delete or status change shows nothing, so the admin assumes it worked.
- **Fix:** Use a central fetch helper that returns or throws `{success:false, message}`, and show a toast on every failure.

### 23. Double-clicking a submit button creates duplicate records
- **Where:** `AD` every submit button (e.g. Divisions.jsx:75, Blog.jsx:138) · `WEB` the Signup, Login and Contact forms
- **Severity / Verified:** Medium / Code
- **Effect:** Duplicate divisions, posts, messages and so on, and the backend has no unique indexes to stop them (#14).
- **Fix:** Add a `submitting` state that disables the button while the request is in flight.

### 24. Free signup gets the paid "Explorer" plan
- **Where:** `BE` authController.js:63 (`plan: 'Explorer'`)
- **Severity / Verified:** Medium / Runtime. After "Sign Up Free", the admin Users page shows the plan as Explorer (the ৳199 tier).
- **Fix:** Default new users to the Free plan.

### 25. District `trip_type` is never saved
- **Where:** `BE` districtController.js:14-30 · `AD` Districts form (no field) · `WEB` HomePage.jsx:91, DistrictsPage.jsx:83
- **Severity / Verified:** Medium / Runtime. All 13 test districts have no `trip_type`, so the home and district cards show an empty badge.
- **Fix:** Add a `trip_type` field to the admin form and include it in `buildDistrictData`.

### 26. Frames page ignores admin-uploaded frames
- **Where:** `WEB` src/pages/FramesPage.jsx:8, 53
- **Severity / Verified:** Medium / Runtime
- **Problem:** The page fetches `/districts` and shows district photos, all labelled "Free". The download buttons have no handler, and the price "৳199/mo" is hard-coded.
- **Effect:** None of the 3 frames created in admin (2 of them premium) appear on the site.
- **Fix:** Read from `GET /api/frames` and add a real download link.

### 27. Map is clipped on mobile
- **Where:** `WEB` src/pages/MapPage.jsx:32-34
- **Severity / Verified:** Medium / Runtime
- **Problem:** At a 390 px viewport, the SVG renders 558 px wide at x = -84, inside a container with `overflow-hidden`. `100vh` also ignores the mobile URL bar.
- **Effect:** Sylhet, Chattogram, Cox's Bazar, Bandarban, Rangamati and the north-west are cut off, with no way to pan or zoom.
- **Fix:** Fit the map with `max-width: 100%; height: auto`, use `dvh`, and consider pinch-zoom.

### 28. Profile check-ins can be lost or toggled by accident
- **Where:** `WEB` src/pages/ProfilePage.jsx:63-66, 156-163
- **Severity / Verified:** Medium / Code
- **Problem:** `toggleDistrict` builds the next list from the current render's state, doesn't `await` the save, and has no catch. A single tap toggles a district immediately.
- **Effect:**
  - Two quick clicks send two PATCHes, and the second overwrites the first.
  - Failures are never shown.
  - Scrolling the map on a phone toggles districts by accident.
- **Fix:** Use a functional update (or server-side `$addToSet` / `$pull`), disable clicks while a save is in flight, show errors, and require a tap then confirm on touch.

### 29. Public pages have no loading, error or empty states
- **Where:** `WEB`
  - Ignore `loading` and `error`: HomePage.jsx:11-14, BlogPage.jsx:8, PlansPage.jsx:9, PartnersPage.jsx:7, MembershipPage.jsx:6, FramesPage.jsx:8, MapPage.jsx:12, ProfilePage.jsx:213.
  - Render blank while loading: BlogDetailPage.jsx:12, DistrictDetailPage.jsx:16, PlanDetailPage.jsx:21, CheckoutPage.jsx:36, PaymentPage.jsx:21, BookingPage.jsx:34.
- **Severity / Verified:** Medium / Code
- **Effect:** When the backend is down, users see headings over empty grids, or "No bookings yet" when the request actually failed.
- **Fix:** Add shared `Spinner`, `ErrorState` and `EmptyState` components and use them on every page.

### 30. Site shows raw parse errors when the server returns HTML
- **Where:** `WEB` src/lib/api.js:28, 39
- **Severity / Verified:** Medium / Code
- **Problem:** `res.json()` is called on every response, whatever its type.
- **Effect:** An Express "Cannot GET" page or a proxy's 502 page reaches the user as "Unexpected token '<'…".
- **Fix:** Check the `content-type` header, or wrap the parse in a try/catch and fall back to `res.statusText`.

### 31. Dead buttons and placeholder links on the public site
- **Where:** `WEB`
  - MembershipPage.jsx:34: plan buttons have no handler, and the page lists SSLCommerz, which isn't supported.
  - PlansPage.jsx:51: the "Save" button does nothing.
  - Navbar.jsx:53: the globe button does nothing.
  - Footer.jsx:21-24, 58, 61 · ContactPage.jsx:82, 90, 94 · DistrictDetailPage.jsx:123: `href="#"` and `tel:+8801XXXXXXXXX`; the footer shows "+880 1XXX-XXXXXX".
- **Severity / Verified:** Medium / Runtime (placeholders seen on every page)
- **Effect:** "WhatsApp us" and the "Join" buttons do nothing.
- **Fix:** Wire up or hide these controls, and move the real contact links into config.

### 32. SEO and hosting gaps
- **Where:** `WEB` index.html:6-7 · the whole app
- **Severity / Verified:** Medium / Code
- **Problem:**
  - Every route shares one `<title>` and description.
  - There are no Open Graph or Twitter tags, no canonical URL, no `robots.txt` and no `sitemap.xml`.
  - There is no SPA rewrite config for the host.
- **Effect:** District, blog and plan pages are indexed as duplicates, social shares show no preview, and reloading `/districts/sylhet` on static hosting returns 404.
- **Fix:**
  - Set a per-page `<title>` and `<meta>` (React 19 supports these natively), add OG tags, robots.txt and a sitemap.
  - Add a rewrite to `index.html` for the chosen host.
  - Consider prerendering the detail pages.

### 33. Admin panel is unusable on mobile
- **Where:** `AD` src/Layout/Sidebar/Sidebar.jsx:53 · the forms
- **Severity / Verified:** Medium / Code
- **Problem:** The sidebar is a fixed `w-64`, and the forms use fixed `grid-cols-2` / `grid-cols-3` layouts.
- **Effect:** On a phone, content gets about 120 px of width.
- **Fix:** Turn the sidebar into a drawer below `md`, and use `grid-cols-1 sm:grid-cols-2` in the forms.

### 34. Hard-coded statistics don't match the real data
- **Where:** `WEB` HomePage.jsx:53-58 · src/data/index.js · DistrictsPage.jsx:49
- **Severity / Verified:** Medium / Runtime
- **Problem:** The home page shows "640+ attractions / 120+ plans / 10,000+ members", and the district filter shows "All (64)" and "Dhaka (13)", while stage has 5 plans and 13 districts.
- **Fix:** Compute these numbers from the API.

### 35. Large single-chunk bundles and repeated full-list fetches
- **Where:** `WEB` src/App.jsx:5-23 (396 KB JS, one chunk) · `AD` (483 KB, one chunk) · `WEB` DistrictDetailPage.jsx:11-14, HomePage.jsx:11-14, BlogDetailPage.jsx:10
- **Severity / Verified:** Medium / Code (build output)
- **Problem:** Neither app uses code splitting. Each detail page re-downloads the full `/districts`, `/plans` and `/divisions` lists.
- **Fix:**
  - Lazy-load routes with `React.lazy` + `Suspense`.
  - Add a shared data cache (context or SWR/React Query), or have the backend return the related data with each record.

## Low

### 36. JWT weaknesses
- **Where:** `BE` src/middleware/auth.js:13-18 · authController.js:24-27, 133-135
- **Problem:**
  - Tokens can't be revoked (admin 12 h, user 7 d).
  - `/auth/me` returns the token's possibly stale data instead of reading the database.
  - There is no startup check for `JWT_SECRET` (or `MONGO_URI`).
  - Both apps store tokens in `localStorage`.
- **Fix:**
  - Fail fast at boot when the config is missing.
  - Add a `tokenVersion` field to support revocation.
  - Have `/me` read from the database.
  - Add a CSP; longer term, move tokens to httpOnly cookies.

### 37. Admin route guard is weak
- **Where:** `AD` src/Layout/Main.jsx:12-27 · src/Layout/Auth/Login.jsx
- **Problem:**
  - The guard renders `<Outlet/>` before its redirect effect runs.
  - It accepts any decodable JWT without checking `role`.
  - The login page doesn't redirect a user who is already logged in, and has no loading state.
- **Fix:** Return `<Navigate to="/login">` when there is no user, and check `user.role === 'admin'`. The server still enforces auth, so this is defense in depth.

### 38. Booking reference code is generated outside the seat rollback
- **Where:** `BE` bookingController.js:98 vs. 124-129
- **Effect:** A database error at that step leaves seats reserved with no booking.
- **Fix:** Generate the code before reserving seats, or move it inside the try block that releases them.

### 39. Plans with no `status` field can never be booked
- **Where:** `BE` bookingController.js:71 vs. 82
- **Problem:** The pre-check treats a missing `status` as `open`, but the reservation filter requires `status: 'open'` exactly.
- **Fix:** Use `status: { $in: ['open', null] }`, or backfill the field.

### 40. Bookings are accepted for trips that have already started
- **Where:** `BE` bookingController.js:69
- **Problem:** Past `start_date` values are not rejected, and `planSlug` is not type-checked.
- **Fix:** Reject past start dates and coerce the slug with `String(planSlug)`.

### 41. Weak signup and profile validation
- **Where:** `BE` authController.js:42-55 · profileController.js:20-33
- **Problem:**
  - Signup has no email format check and no minimum password length on the server; the 6-character rule is client-only.
  - Name and phone accept any type, and `visitedDistricts` accepts any shape or size.
  - An admin token on `PATCH /profile` returns 500.
- **Fix:** Validate types and formats, require a password of at least 8 characters, cap `visitedDistricts`, and return 404 when no user is found.

### 42. Contact status accepts any value
- **Where:** `BE` contactController.js:38-40
- **Problem:** Any value is accepted, and an unknown ID never returns 404. The admin sends `new`, `read` and `resolved`.
- **Fix:** Whitelist `['new', 'read', 'resolved']` and return 404 when no message matches.

### 43. Inactive payment methods are publicly listed
- **Where:** `BE` paymentMethodController.js:13
- **Problem:** `GET /payment-methods?all=1` is public and includes inactive methods.
- **Fix:** Move the full list to an admin-only route.

### 44. Uploaded files are never deleted
- **Where:** `BE` every `deleteX` controller, every `editX` that replaces an image, and planController.js:76 (the upload is kept even when validation returns 400)
- **Verified:** Runtime. Deleted records' images stay on disk.
- **Fix:** On delete or replace, `fs.unlink` the old file (after checking the resolved path is inside `uploads/`), and delete `req.file` when a request fails validation.

### 45. Deletes don't check what references the record
- **Where:** `BE` deleteDistrict, deleteDivision, deletePlan
- **Effect:**
  - Hotels, guides, agents, checkpoints and transports keep pointing at a deleted district.
  - Bookings keep pointing at a deleted plan, and cancelling them later releases no seats.
- **Fix:** Block the delete while references exist, or switch to soft-delete.

### 46. Edit responses are incomplete
- **Where:** `BE` every `editX` response (e.g. hotelController.js:54)
- **Problem:** When no new file is uploaded, the returned object has no `image` key, and its `_id` is a string.
- **Fix:** Return the document from `findOneAndUpdate({ returnDocument: 'after' })`.

### 47. Content seed script wipes collections without a guard
- **Where:** `BE` src/scripts/seedContent.js:153-160
- **Problem:** It runs `deleteMany({})` on 6 collections with no environment check, and the seeded plans have no `price`, `status` or `seats_available`, so they can't be booked.
- **Fix:** Require a `--force` flag, refuse to run when `NODE_ENV=production`, and seed the booking fields.

### 48. Admin edit forms can save the literal string "undefined"
- **Where:** `AD` Partners.jsx:27, Frames.jsx:25, and `toFormState` in Districts, Hotels, Transport and DistrictAgents
- **Problem:** The row is spread into form state without defaults.
- **Effect:** For any record missing a field, the string `"undefined"` is sent in the FormData and stored.
- **Fix:** Merge with the empty form first: `{ ...empty, ...row }`, as Blog does.

### 49. Rich-text editor problems
- **Where:** `AD` src/components/RichTextEditor.jsx:288-289, 399
- **Problem:**
  - An inserted image can't be removed with Backspace or Delete (seen at runtime).
  - `injectResizer` runs twice, and StrictMode doubles it again, which can draw duplicate resize handles.
  - Image upload failures are only logged to the console.
- **Fix:** Handle deleting a selected image, run the setup once, and show upload errors to the admin.

### 50. Admin memory leak and stale-closure bugs
- **Where:** `AD` src/components/FileInput.jsx:15, 33 · Contact.jsx:15
- **Problem:**
  - `URL.createObjectURL` runs on every render and is never revoked; the remounting in #1 makes this worse.
  - `setRows(rows.map(...))` runs after an `await`, so two quick status changes lose one of them.
- **Fix:** Create the object URL in `useMemo` / `useEffect` and revoke it in cleanup. Use the functional form `setRows(prev => ...)`.

### 51. Admin uses `apiSend` for GET requests
- **Where:** `AD` every `refresh()`
- **Problem:** `apiSend` adds a `Content-Type` header, which forces a CORS preflight and triggers the lint warning. On error the list is set to `[]`, so it silently empties.
- **Fix:** Use `apiGet` and show the error instead of clearing the list.

### 52. Accessibility gaps in both frontends
- **Where:**
  - `AD`: labels have no `htmlFor` / `id`. `Modal.jsx` has no `role="dialog"`, no Esc to close, no focus trap, and an unlabelled × button. Sidebar.jsx:71 removes the focus outline. Action cells use `<td className="flex">`.
  - `WEB`: icon-only buttons have no `aria-label` (Navbar.jsx:59, 68 · Footer.jsx:21-24); the menu toggle has no `aria-expanded`; map districts are clickable `<g>` elements with no role, `tabIndex` or keyboard handler (MapPage.jsx:52-58, ProfilePage.jsx:156).
- **Fix:** Add labels and roles, make the map markers keyboard-operable, and offer a list fallback for the map.

### 53. Smaller public-site bugs
- **Where:** `WEB`
- **Problems:**
  - `useFetch.js:9-20`: when the path changes, the previous page's data or error shows for one render.
  - `DistrictsPage.jsx:11`: the division filter isn't kept in the URL, so back/forward and shared links lose it.
  - `DistrictsPage.jsx:71-73`: the internal status (`skeleton` / `good` / `complete`) is shown to the public.
  - `DistrictDetailPage.jsx:144-145`: "Login to check in" links to `/membership` and is shown to logged-in users too.
  - `App.jsx:66`: the 404 page uses `<a href="/">`, which reloads the whole app.
  - `Navbar.jsx:41`: the active-link check is exact, so `/districts/x` doesn't highlight "Districts".
  - `ProfilePage.jsx:21, 32-56`: a new `[]` on every render re-parses the SVG each time.
  - `api.js:5-9`: `resolveImage` returns `''` for a record with no image, giving `<img src="">` (not exercised at runtime, because every test record had an image).
  - Map labels use old spellings (Bogra, Chittagong, Barisal, Shatkhira, Maulvibazar) while the data uses the new ones (runtime).
  - After payment submit, the spinner stays up for more than 2 s even though the backend has already saved the payment (runtime).
- **Fix:** Fix each of these individually.

### 54. Images are not optimized
- **Where:** `WEB` card and hero images (Home, Plans, Frames, detail pages)
- **Problem:** No `loading="lazy"`, and no `width` / `height`, which causes layout shift. Unsplash URLs are fixed at `?w=600`, even for full-width heroes.
- **Fix:** Add `loading="lazy"` and explicit dimensions, and use `srcset`.

### 55. Minor admin UI issues
- **Where:** `AD` Contact.jsx:45 · src/components/ConfirmDelete.js
- **Problem:** The `createdAt` date is shown as a raw ISO string, and the SweetAlert dialog uses a dark theme inside the light daisyUI theme.
- **Fix:** Format the date, and match the dialog theme to the app.

### 56. Dead code, unused dependencies and maintainability
- **Where:** all three repos
- **Problem:**
  - **Site:** `leaflet` / `react-leaflet` are installed but never used; `public/assets/BD_Map_admin.svg` (102 KB) ships but is unused; 8 unused imports are flagged by lint; `TOKEN_KEY` is exported but unused.
  - **Admin:** `react-icons` is unused; `apiGet` and the `token` value in context are never read.
  - **Backend:**
    - `parseJsonField` is copy-pasted into 4 controllers.
    - There is no `helmet`, so `X-Powered-By` is exposed.
    - There is no graceful shutdown.
    - `.DS_Store` and `.sf/` are committed.
    - `.vscode/tasks.json` auto-runs `node index.js` when the folder is opened.
- **Fix:** Remove the unused code and dependencies, add `helmet`, and gitignore the editor and OS files.

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
