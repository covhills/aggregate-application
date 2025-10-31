# Aggregator App test

A referral management system built with React, TypeScript, Firebase, and Chakra UI.

## Features

- **Firebase Authentication**: Secure email/password authentication
- **Form Page**: Submit new referral records with auto-captured timestamps
- **Admin Dashboard**: View, edit, delete, and sort referral records
- **Metrics Dashboard**: Analytics with date range filtering, conversion rates, and referral tracking
- **Responsive Design**: Mobile-friendly UI built with Chakra UI
- **Dark Mode Support**: Toggle between light and dark themes

## Setup

### Prerequisites

- Node.js 16+ and npm
- Firebase project with Firestore and Authentication enabled

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
   - Enable Email/Password authentication
   - Create a Firestore database
   - Copy your Firebase config to `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Update the GitHub Pages URL in `package.json`:
```json
"homepage": "https://yourusername.github.io/aggregator-app"
```

4. Update the base path in `vite.config.ts` if needed:
```typescript
base: '/aggregator-app/'
```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Firebase Setup

1. **Authentication**:
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable Email/Password provider
   - Add users in the Authentication tab

2. **Firestore**:
   - Go to Firebase Console → Firestore Database
   - Create database (start in production mode or test mode)
   - Set up security rules as needed

Example Firestore rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /referrals/{referralId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Deployment to GitHub Pages

1. Build the project:
```bash
npm run build
```

2. Deploy to GitHub Pages:
```bash
npm run deploy
```

The app will be deployed to your GitHub Pages URL.

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── ColorModeToggle.tsx
│   └── ProtectedRoute.tsx
├── config/             # Firebase configuration
│   └── firebase.ts
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── pages/              # Page components
│   ├── Login.tsx
│   ├── FormPage.tsx
│   ├── AdminPage.tsx
│   └── MetricsPage.tsx
├── types/              # TypeScript type definitions
│   └── env.d.ts
├── App.tsx             # Main app component with routing
├── main.tsx            # Entry point
├── theme.ts            # Chakra UI theme configuration
└── index.css           # Global styles
```

## Form Fields

- **First Name** (required)
- **Last Name** (required)
- **Lead Source** (required, dropdown: Insurance, Kaiser, Outreach, Direct)
- **Referral Source** (optional text)
- **Referral Out** (optional text)
- **Insurance Company** (optional text)
- **Program** (optional dropdown: DTX, RTC, PHP, IOP)
- **Referral Sent To** (optional dropdown: SBR, Cov hills)
- **Admitted** (checkbox)
- **Created At** (auto-generated timestamp)

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Build tool
- **Firebase** - Authentication and Firestore database
- **Chakra UI** - Component library
- **React Router** - Client-side routing
- **Framer Motion** - Animations (via Chakra UI)

## License

Private project - All rights reserved
