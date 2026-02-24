# Rusheel College Management System (MERN)

Production-grade role-based College Management System built with:
- Frontend: React + Vite + Tailwind + Framer Motion
- Backend: Node.js + Express + JWT + bcrypt
- Database: MongoDB Atlas + Mongoose

## Features
- JWT authentication with role-based route protection.
- Email-verified password change flow (OTP code verification).
- Email OTP verification for profile dashboards (student, teacher, admin).
- Forgot password flow on login with email OTP-based reset.
- Role portals: Student, Teacher, Admin.
- Student: profile, courses, timetable, attendance, marks, assignments submission, notices, fee status.
- Teacher: assigned courses, class students, attendance marking, marks upload, assignment upload, announcements.
- Admin: full CRUD for students/teachers/courses, enrollments, academic sessions, notices, and analytics.
- Premium glassmorphic responsive UI with dark mode, charts, toasts, and loading states.

## Folder Structure
```text
backend/
  src/
    config/ models/ controllers/ routes/ middleware/ validators/ seeds/
frontend/
  src/
    pages/ components/ hooks/ services/ layouts/context
```

## Backend Setup
1. Copy env file:
   - `backend/.env.example` -> `backend/.env`
2. Set `MOCK_MODE=false` and configure `MONGODB_URI`.
   - For email OTP delivery configure SMTP values:
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
3. Install and run:
   - `cd backend`
   - `npm install`
   - `npm run dev`
4. Initialize clean database with only bootstrap admin:
   - `npm run seed`

## Frontend Setup
1. Copy env file:
   - `frontend/.env.example` -> `frontend/.env`
2. Install and run:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Bootstrap Credentials
- Username: `Rusheel007`
- Password: `12345`
- Login accepts either username or email.

## API Base URL
- Default backend: `http://localhost:5000/api`
- Frontend env key: `VITE_API_URL`

## Verified Commands
- Frontend lint: `npm run lint` (pass)
- Frontend build: `npm run build` (pass)
- Backend syntax check: `node --check` over all `src/**/*.js` (pass)
