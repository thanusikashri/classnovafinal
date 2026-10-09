# Smart Classroom

A full-stack online classroom and learning management platform inspired
by Google Classroom, with timed quizzes, automatic evaluation, student
performance analytics, and AI-assisted quiz generation.

> **Project status:** In development\
> **Team size:** 2 members

## Table of Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [User Roles](#user-roles)
-   [Project Architecture](#project-architecture)
-   [Team Responsibilities](#team-responsibilities)
-   [Prerequisites](#prerequisites)
-   [Getting Started](#getting-started)
-   [Environment Variables](#environment-variables)
-   [External Service Setup](#external-service-setup)
-   [Running the Application](#running-the-application)
-   [Database Models](#database-models)
-   [API Overview](#api-overview)
-   [Security Considerations](#security-considerations)
-   [Testing](#testing)
-   [Git Workflow](#git-workflow)
-   [Implementation Roadmap](#implementation-roadmap)
-   [Troubleshooting](#troubleshooting)

## Overview

Smart Classroom provides a central place for teachers and students to
manage classroom activities online.

Teachers can create classes, share materials, conduct attendance,
publish quizzes, review submissions, and monitor class performance.
Students can join classes, access resources, submit attendance using a
six-digit OTP, take quizzes, view permitted results, and track their
progress. Administrators can manage users and view platform-level
information.

The application combines a Google Classroom-style learning workflow with
quiz features inspired by interactive assessment platforms.

### Project Goals

-   Provide a simple, responsive classroom experience.
-   Bring classes, learning materials, attendance, and assessments into
    one platform.
-   Reduce manual work through automatic MCQ evaluation and attendance
    tracking.
-   Help teachers identify topics that students find difficult.
-   Allow teachers to generate draft quiz questions from learning
    materials using an AI service.
-   Enforce authentication, role permissions, and class-level access
    controls.

## Features

### Core classroom features

1.  **Authentication and user management** --- registration, login,
    password hashing, JWT authentication, profiles, and protected
    routes.
2.  **Role-based access** --- separate Admin, Teacher, and Student
    permissions.
3.  **Class management** --- create and manage classes, generate class
    codes, and enroll students.
4.  **Class stream and announcements** --- share class updates and
    optional attachments.
5.  **OTP attendance** --- teachers start an attendance session and
    students submit a short-lived six-digit code.
6.  **Attendance history** --- view attendance records and calculate
    attendance percentages.
7.  **Leave applications** --- students apply for leave and authorized
    teachers review requests.
8.  **Study materials** --- upload and access PDFs and other supported
    file types.
9.  **Quiz creation** --- teachers create, edit, schedule, and publish
    quizzes.
10. **MCQ management** --- manage questions, options, correct answers,
    marks, explanations, and topic labels.
11. **Timed assessments** --- students complete quizzes within a
    server-enforced time limit.
12. **Automatic evaluation** --- the backend evaluates MCQ submissions
    and calculates scores.
13. **Quiz results and history** --- students and teachers view results
    according to permissions.
14. **Dashboards and notifications** --- role-specific summaries, recent
    activity, deadlines, and in-app notifications.

### Performance and AI features

15. **Reporting and analytics** --- class attendance, quiz completion,
    and score summaries.
16. **Student performance intelligence** --- an initial rule-based
    indicator using available attendance and assessment data.
17. **Weak-topic detection** --- topic-level accuracy summaries based on
    question tags and real quiz attempts.
18. **AI quiz generator** --- creates draft MCQs from supported study
    material. Teachers must review and approve questions before
    publication.

Features should be implemented incrementally. The exact availability of
each feature depends on the current development phase.

## Technology Stack

  -----------------------------------------------------------------------
  Layer                               Technology
  ----------------------------------- -----------------------------------
  Frontend                            React, Vite, JavaScript

  Styling                             Tailwind CSS

  Routing                             React Router

  API requests                        Axios

  Charts                              Recharts

  Icons                               Lucide React

  Backend                             Node.js, Express.js

  Database                            MongoDB Atlas

  ODM                                 Mongoose

  Authentication                      JWT and bcrypt

  File storage                        Cloudinary

  AI quiz generation                  External AI API

  Version control                     Git and GitHub

  Potential deployment                Vercel for frontend; Render or
                                      Railway for backend
  -----------------------------------------------------------------------

The stack may be adjusted if the team documents the reason and updates
this README.

## User Roles

### Admin

-   Manage user accounts and roles.
-   View and manage classes.
-   View platform statistics.
-   Access authorized reports and administrative functions.

### Teacher

-   Create and manage classes.
-   Enroll or remove students.
-   Post announcements.
-   Conduct OTP attendance.
-   Upload and manage study materials.
-   Create and publish quizzes.
-   Review leave applications.
-   View quiz results and class analytics.
-   Review and edit AI-generated questions before publishing.

### Student

-   Join classes using a class code or invitation.
-   View class announcements and materials.
-   Submit attendance using an active OTP.
-   View attendance history and percentage.
-   Submit and track leave applications.
-   Take available timed quizzes.
-   View permitted quiz results and performance summaries.

All permissions must be checked by the backend. Hiding a frontend button
alone is not sufficient.

## Project Architecture

The application uses a React frontend, an Express REST API, MongoDB for
structured application data, Cloudinary for files, and an external AI
API for quiz generation.

``` text
smart-classroom/
├── client/                    # React + Vite frontend
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       ├── routes/
│       ├── services/           # Axios/API clients
│       ├── hooks/
│       ├── context/
│       └── utils/
├── server/                    # Node.js + Express backend
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── validators/
│       ├── utils/
│       └── app.js
├── docs/                       # API contracts and design notes
├── .gitignore
├── .env.example
└── README.md
```

This is the proposed structure. If the repository already has a
different structure, preserve working code and document the actual
layout.

### Request flow

1.  A user interacts with the React frontend.
2.  The frontend sends an HTTP request to the Express API.
3.  Authentication and authorization middleware validate the request.
4.  Controllers and services apply business rules.
5.  Mongoose reads or writes data in MongoDB.
6.  File operations use Cloudinary where required.
7.  AI quiz generation calls the configured AI provider from the backend
    only.
8.  The API returns validated results to the frontend.

## Team Responsibilities

Both members work on their own frontend and backend modules and
coordinate through shared API contracts.

### Member 1 --- Platform, Classroom, and Student Management

Responsible for:

-   Authentication, user profiles, and role-based access.
-   Admin user management.
-   Class creation, class codes, and student enrollment.
-   Class stream and announcements.
-   OTP attendance sessions and student attendance submission.
-   Attendance history and percentage calculations.
-   Leave applications and review workflow.
-   Study-material uploads, access, and deletion.
-   Student dashboard.
-   Classroom, attendance, and leave sections of the teacher dashboard.
-   Admin dashboard and in-app notifications.
-   Tests and API documentation for assigned modules.

### Member 2 --- Quizzes, Assessment, and Performance Intelligence

Responsible for:

-   Quiz creation, editing, scheduling, and publication.
-   MCQ question management.
-   Timed quiz interface and attempt restrictions.
-   Answer submission and server-side evaluation.
-   Quiz results and attempt history.
-   Teacher assessment reports.
-   Question-level accuracy analysis.
-   Rule-based student performance indicators.
-   Topic labels, weak-topic detection, and charts.
-   AI material-to-quiz generation and teacher review workflow.
-   Tests and API documentation for assigned modules.

### Shared responsibilities

-   Agree on API contracts and database relationships before
    integration.
-   Maintain a consistent UI and navigation system.
-   Review each other's pull requests.
-   Integrate modules and resolve conflicts.
-   Test complete student, teacher, and admin workflows.
-   Maintain documentation and deployment configuration.

## Prerequisites

Install the following before running the project:

-   [Node.js](https://nodejs.org/) --- use a current LTS release.
-   npm, included with Node.js.
-   [Git](https://git-scm.com/).
-   A [MongoDB Atlas](https://www.mongodb.com/atlas) account and
    database deployment.
-   A [Cloudinary](https://cloudinary.com/) account for file uploads.
-   An API key from the AI provider selected for quiz generation.
-   A code editor such as Visual Studio Code.

Check your installation:

``` bash
node --version
npm --version
git --version
```

## Getting Started

### 1. Clone the repository

Replace the example URL with the actual GitHub repository URL.

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd smart-classroom
```

### 2. Install dependencies

The commands depend on the final folder structure. For the proposed
`client/` and `server/` layout:

``` bash
cd server
npm install
cd ../client
npm install
cd ..
```

If the project uses a root workspace or different package structure,
follow the scripts and instructions in the actual `package.json` files.

### 3. Configure environment variables

Create a `server/.env` file based on `server/.env.example` (or the
location documented by the project).

``` bash
cp server/.env.example server/.env
```

If the example file is stored at the repository root, copy it from that
location instead. Fill in the required values locally. Never commit the
real `.env` file.

### 4. Configure external services

Set up MongoDB Atlas, Cloudinary, and the chosen AI provider as
described in [External Service Setup](#external-service-setup).

### 5. Start the application

Use the scripts defined in the project's `package.json` files. A typical
development setup uses one terminal for the backend and another for the
frontend.

## Environment Variables

Create a `.env.example` file containing variable names only. The backend
may require:

``` dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

AI_API_KEY=
AI_MODEL=
```

Notes:

-   `MONGODB_URI` must use the connection string for your Atlas database
    user.
-   `JWT_SECRET` must be a long, random secret generated for this
    application.
-   `CLIENT_URL` should match the frontend origin used by the backend's
    CORS configuration.
-   `AI_MODEL` is optional if the chosen provider uses a fixed model or
    the implementation sets a default.
-   Only include variables that the implemented application actually
    uses.
-   Do not add secret values to frontend environment variables. Anything
    bundled into the browser should be considered public.

## External Service Setup

### MongoDB Atlas

1.  Create an Atlas project and a database deployment.
2.  Create a **database user** with a strong password. This is separate
    from your MongoDB Atlas website login.
3.  Add your development IP address to the project's network access
    list. Avoid opening database access to every IP unless there is a
    temporary, understood reason.
4.  Open the deployment's **Connect** menu and select the driver
    connection option.
5.  Copy the connection string and replace the password placeholder with
    the database user's password.
6.  Set the resulting URI in `MONGODB_URI`.
7.  Confirm that the backend connects successfully.

Do not share your password or complete connection string in public
issues, screenshots, or source control.

### Cloudinary

1.  Create a Cloudinary account.
2.  Open the account dashboard.
3.  Copy the cloud name, API key, and API secret into the backend
    environment variables.
4.  Implement file uploads through the backend or a secure
    upload-signing flow.
5.  Store file metadata and the resulting URL in MongoDB.
6.  Validate allowed file types and file sizes, and enforce
    authorization when users access materials.

Never expose the Cloudinary API secret in frontend code.

### AI provider

1.  Choose an AI provider that supports the required text-generation
    API.
2.  Create an API key in the provider's dashboard.
3.  Store it in `AI_API_KEY` on the backend.
4.  Implement a backend service that sends extracted study text and
    requests structured MCQ output.
5.  Validate the returned questions before showing them to the teacher.
6.  Handle invalid responses, timeouts, rate limits, and unavailable
    service errors.
7.  Require teacher review before a generated quiz can be published.

The AI feature is separate from ordinary quiz evaluation. Standard MCQ
evaluation and the initial rule-based analytics do not require an AI API
call.

## Running the Application

The exact commands depend on the scripts implemented in each package. A
common setup is:

**Terminal 1 --- Backend**

``` bash
cd server
npm run dev
```

**Terminal 2 --- Frontend**

``` bash
cd client
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173`.

If `npm run dev` is unavailable, inspect the relevant `package.json` and
use the script provided there. Do not assume that these commands exist
until the project scripts have been created.

## Database Models

The initial data model may include:

  -----------------------------------------------------------------------
  Model                               Purpose
  ----------------------------------- -----------------------------------
  User                                User identity, hashed password,
                                      role, and profile

  Class                               Class details, owner/teacher, and
                                      class code

  Enrollment                          Student-to-class membership, if
                                      stored separately

  Announcement                        Class stream posts and attachments

  AttendanceSession                   Active session, OTP hash/value,
                                      expiry, and status

  AttendanceRecord                    Student attendance result and
                                      timestamp

  LeaveApplication                    Dates, reason, status, reviewer,
                                      and decision

  Material                            Class ID, title, file URL, type,
                                      uploader, and timestamp

  Quiz                                Quiz settings, schedule, class, and
                                      publication status

  Question                            Question text, options, correct
                                      answer, marks, and topic

  QuizAttempt                         Student answers, score, timestamps,
                                      and attempt status

  Notification                        Recipient, message, read status,
                                      and timestamp
  -----------------------------------------------------------------------

Use Mongoose validation, references, and appropriate indexes. Exact
fields should be documented alongside the implemented schemas.

### Important data rules

-   Never store plaintext passwords.
-   Avoid duplicate enrollment and attendance records.
-   Validate class membership before returning class-specific data.
-   Do not send correct answers to students before disclosure is
    permitted.
-   Store attempt results on the backend.
-   Enforce quiz timing and attempt limits on the server.
-   Use real database data for dashboards and analytics.
-   Define consistent deletion and retention behavior for related
    records.

## API Overview

Use `/api` as the API prefix unless the project documents another
convention.

### Authentication

  -----------------------------------------------------------------------
  Method                  Endpoint                Purpose
  ----------------------- ----------------------- -----------------------
  POST                    `/api/auth/register`    Register a user,
                                                  subject to registration
                                                  policy

  POST                    `/api/auth/login`       Authenticate a user

  GET                     `/api/auth/me`          Return the current
                                                  authenticated user

  POST                    `/api/auth/logout`      Log out according to
                                                  the selected token
                                                  strategy
  -----------------------------------------------------------------------

### Classes and announcements

  Method   Endpoint                                 Purpose
  -------- ---------------------------------------- --------------------------------------------
  POST     `/api/classes`                           Create a class
  GET      `/api/classes`                           List classes available to the current user
  GET      `/api/classes/:id`                       Get authorized class details
  PUT      `/api/classes/:id`                       Update a class
  DELETE   `/api/classes/:id`                       Delete a class
  POST     `/api/classes/:id/students`              Enroll a student
  DELETE   `/api/classes/:id/students/:studentId`   Remove a student
  GET      `/api/classes/:id/announcements`         List class announcements
  POST     `/api/classes/:id/announcements`         Create an announcement

### Attendance and leave

  -----------------------------------------------------------------------------------------------
  Method                  Endpoint                                        Purpose
  ----------------------- ----------------------------------------------- -----------------------
  POST                    `/api/classes/:id/attendance/sessions`          Start an attendance
                                                                          session

  POST                    `/api/attendance/submit-otp`                    Submit an OTP

  GET                     `/api/attendance/student/:id`                   View authorized student
                                                                          attendance

  GET                     `/api/attendance/class/:id`                     View class attendance

  POST                    `/api/attendance/sessions/:id/regenerate-otp`   Regenerate an active
                                                                          session OTP

  POST                    `/api/attendance/sessions/:id/end`              End an attendance
                                                                          session

  POST                    `/api/leaves`                                   Submit a leave
                                                                          application

  GET                     `/api/leaves/student/:id`                       View a student's
                                                                          applications

  PUT                     `/api/leaves/:id/review`                        Approve or reject an
                                                                          application
  -----------------------------------------------------------------------------------------------

### Materials and assessments

  Method   Endpoint                           Purpose
  -------- ---------------------------------- -------------------------------
  POST     `/api/materials`                   Upload a material
  GET      `/api/materials/class/:classId`    List class materials
  DELETE   `/api/materials/:id`               Delete an authorized material
  POST     `/api/quizzes`                     Create a quiz
  GET      `/api/quizzes/class/:classId`      List class quizzes
  GET      `/api/quizzes/:id`                 Get an authorized quiz
  PUT      `/api/quizzes/:id`                 Update a quiz
  DELETE   `/api/quizzes/:id`                 Delete a quiz
  POST     `/api/quizzes/:id/start`           Start a quiz attempt
  POST     `/api/quizzes/:id/submit`          Submit an attempt
  GET      `/api/quizzes/:id/results`         Get authorized results
  POST     `/api/quizzes/:quizId/questions`   Add a question
  PUT      `/api/questions/:id`               Update a question
  DELETE   `/api/questions/:id`               Delete a question

### AI and analytics

  -----------------------------------------------------------------------------------------
  Method                  Endpoint                                  Purpose
  ----------------------- ----------------------------------------- -----------------------
  POST                    `/api/ai/generate-quiz`                   Generate draft
                                                                    questions from material

  GET                     `/api/analytics/student/:id`              Get authorized student
                                                                    analytics

  GET                     `/api/analytics/class/:classId`           Get class analytics

  GET                     `/api/analytics/class/:classId/topics`    Get topic-level
                                                                    performance

  GET                     `/api/analytics/class/:classId/at-risk`   Identify students who
                                                                    may need attention
  -----------------------------------------------------------------------------------------

This table is the planned API contract. Update it as routes are
implemented. Every endpoint must validate authentication, permissions,
input data, and resource ownership.

## Security Considerations

-   Hash passwords with bcrypt.
-   Keep JWT secrets, database credentials, Cloudinary secrets, and AI
    API keys on the backend.
-   Use role-based and resource-level authorization.
-   Validate request bodies and uploaded files.
-   Apply rate limiting to authentication and sensitive endpoints.
-   Configure CORS for known frontend origins.
-   Use HTTPS in production.
-   Avoid logging credentials, tokens, or sensitive student data.
-   Use secure token storage and an appropriate cookie/token strategy.
-   Treat AI output as untrusted input and validate it before saving.
-   Ensure quiz answer keys cannot be retrieved by students before
    permitted disclosure.
-   Enforce attendance and quiz rules on the backend, not only in the
    UI.
-   Use least-privilege database credentials and appropriate production
    network restrictions.

## Testing

Test both individual modules and complete workflows.

### Required test scenarios

-   Registration, login, logout, and protected routes.
-   Admin, teacher, and student permission boundaries.
-   Class creation, joining, and duplicate enrollment.
-   Valid, invalid, expired, and regenerated attendance OTPs.
-   Duplicate attendance attempts and ended attendance sessions.
-   Material upload validation and unauthorized access.
-   Quiz availability windows and attempt limits.
-   Correct and incorrect MCQ answers.
-   Automatic submission after timeout.
-   Duplicate submission prevention.
-   Accurate quiz and attendance analytics.
-   Malformed AI responses and AI provider failures.
-   Responsive navigation and form validation.

Run the test commands defined in the project. Document known gaps rather
than marking unimplemented tests as passing.

## Git Workflow

Suggested branches:

-   `main` --- stable integrated application.
-   `member1-platform` --- classroom, users, attendance, materials, and
    administration.
-   `member2-assessment` --- quizzes, evaluation, analytics, and AI
    generation.

Recommended workflow:

1.  Pull the latest changes from the shared repository.
2.  Work on the relevant feature branch.
3.  Commit small, meaningful changes.
4.  Push the branch and open a pull request.
5.  Review API and schema compatibility with the other member.
6.  Merge after review and tests.
7.  Test the integrated application regularly.

Never commit `.env`, database passwords, API keys, access tokens, or
real student records.

## Implementation Roadmap

-   [ ] Phase 1: Repository setup, authentication, and roles.
-   [ ] Phase 2: User profiles, classes, enrollment, and class stream.
-   [ ] Phase 3: OTP attendance, leave applications, and study
    materials.
-   [ ] Phase 4: Quiz creation, timed attempts, evaluation, and results.
-   [ ] Phase 5: Dashboards, notifications, reporting, and performance
    analytics.
-   [ ] Phase 6: AI quiz generation and teacher review.
-   [ ] Phase 7: Integration tests, security review, documentation, and
    deployment.

## Troubleshooting

### MongoDB connection fails

-   Confirm `MONGODB_URI` is correct.
-   Confirm the database user and password are correct.
-   Check that the development IP is permitted in Atlas network access.
-   URL-encode special characters in the password when required by the
    connection string.
-   Check the backend logs without sharing the full connection string.

### File uploads fail

-   Confirm the Cloudinary credentials are configured on the backend.
-   Check the file size and allowed file types.
-   Verify the backend upload configuration and Cloudinary account
    limits.
-   Do not expose API secrets in browser code.

### AI quiz generation fails

-   Confirm the AI API key and model configuration.
-   Check provider usage limits and billing status.
-   Handle empty or unreadable PDF text.
-   Validate the generated response and show a useful error.
-   Allow teachers to create quizzes manually when AI is unavailable.

### Frontend cannot reach the backend

-   Confirm both development servers are running.
-   Check the API base URL.
-   Confirm the backend CORS configuration allows the frontend origin.
-   Inspect browser developer tools and backend logs for the actual
    error.

------------------------------------------------------------------------

## Project Principles

1.  Build a reliable classroom platform before adding advanced features.
2.  Keep the Google Classroom-style learning workflow clear and simple.
3.  Treat security and authorization as backend responsibilities.
4.  Use real database records for results and analytics.
5.  Keep AI-generated questions under teacher control.
6.  Integrate both members' modules through agreed API contracts.
7.  Document implemented behavior accurately and never claim unfinished
    features are complete.
