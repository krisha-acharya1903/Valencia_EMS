# Valencia Nutrition Enterprise Management System

A production-style React + Firebase EMS application built from the supplied Stitch layout references.

## Stack

- React + Vite
- Tailwind CSS
- Firebase Authentication, Firestore, Storage
- React Router
- Recharts
- Lucide React
- React Hot Toast

## Demo Login

The app runs with local seed data until real Firebase credentials are configured.

- Admin: `admin@valencianutrition.com`
- Manager: `sarah.miller@valencianutrition.com`
- Employee: `alex.jensen@valencianutrition.com`
- Password: `password123`

## Firebase Setup

Update `src/firebase.js` with your Firebase web app config:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

When these values are no longer placeholders, the service layer switches to Firebase-backed calls.

## Firestore Collections

- `users`
- `projects`
- `tasks`
- `taskSubmissions`
- `attendance`
- `leaveRequests`
- `notifications`
- `activityLogs`

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Implemented Modules

- Role-aware authentication and routing
- Admin, manager, and employee dashboards
- Project management with members and managers
- Task management with assignment and progress
- Task submission workflow
- Admin/manager submission review workflow
- Work progress Kanban, Gantt, and status views
- Attendance check-in/check-out
- Leave request and approval flow
- User management without deleting Firebase Auth users
- Employee analytics and charts
- Activity logging through the service layer
"# Valencia_EMS" 
