A full-stack event check-in web app. Attendees self-register for an event and receive a QR-coded ticket by email. Organizers log in, manage events, and check attendees in at the door by scanning (or manually entering) their ticket code.

Built as an industrial training (SIWES) project.

## Features

- **Public registration** — attendees register with name/email/ticket type and receive a QR-coded ticket by email, with an on-screen backup ticket (QR + selectable plain-text code) in case email is slow or undelivered
- **Organizer auth** — JWT-based login/registration, with protected routes for everything except public registration
- **Multi-event dashboard** — organizers can manage and switch between every event they own, with live stats, a check-in-over-time chart, and a searchable/filterable attendee table with CSV export
- **QR check-in** — camera-based scanning (`@zxing/browser`) with a manual code-entry fallback, duplicate-scan protection, and an undo action for mis-scans
- **Offline-resilient scanning** — scans queue locally (IndexedDB) if the network drops, and sync automatically once connectivity returns
- **Rate-limited public endpoint** — the open registration endpoint is protected against abuse
- **Resend ticket email** — organizers can re-trigger the ticket email for any attendee whose email failed to send

## Tech Stack

- **Client:** React + Vite (JavaScript/JSX), Tailwind CSS
- **Server:** Express + MongoDB/Mongoose (JavaScript)
- **Auth:** JSON Web Tokens (JWT)
- **Email:** Nodemailer
- **QR generation:** `qrcode`
- **QR scanning:** `@zxing/browser`
