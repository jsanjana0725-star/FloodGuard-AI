# FloodGuard AI

A responsive React + Vite landing page, Firebase authentication flow, and dashboard concept for an environmental hackathon. The dashboard presents illustrative rainfall, weather, flood-risk, map, and community-alert information for a few sample Indian cities.

> **Demo only:** All displayed readings, risk indicators, map zones, and alerts are static sample data. The app does not connect to live weather, sensor, mapping, or flood-prediction services. Do not use it for emergency or safety decisions.
>
> **Authentication:** Firebase Email/Password authentication is supported. It becomes active only after you configure your Firebase project using the setup steps below. Without configuration, the forms explain what is missing and cannot create accounts or sign users in. The dashboard remains available through the explicit demo entry point.

## Run locally

1. Install [Node.js](https://nodejs.org/) if it is not already installed.
2. Open a terminal in this project folder.
3. Install the project dependencies:

   ```sh
   npm install
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open the local URL printed by Vite (usually `http://localhost:5173`).

To create and preview a production build:

```sh
npm run build
npm run preview
```

## Using the demo dashboard

- Search for **Vijayawada**, **Mumbai**, **Chennai**, **Bengaluru**, or **Delhi** to switch between sample datasets.
- Search for another city to see the no-demo-data state. Submitting an empty search shows a validation message.
- The rainfall, weather, risk, trend, map, and alert values are examples only; no live lookup or prediction is performed. A live weather forecast is not connected.

## Landing page and Firebase authentication

- The landing page opens at `/` (or `#/`) and provides links to sign up, sign in, and explicitly explore the demo dashboard.
- Login and sign-up are available at `#/login` and `#/signup`. With Firebase configured, they create accounts, sign in, and send password-reset emails through Firebase Authentication. The app never writes passwords to browser storage; Firebase handles credential exchange and authentication session tokens.
- The login **Remember me** checkbox selects Firebase's local session persistence. When unchecked, the session uses session persistence. These settings control Firebase's sign-in session, not password storage.
- The demo dashboard's **Log out** action signs out of Firebase when an authenticated user is signed in, then returns to the landing page. The separate demo-dashboard entry remains available without an account.

### Configure Firebase once

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/) and register a Web app in its project settings.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Settings → Authorized domains**, make sure the hostname you use locally (usually `localhost`) and your eventual production hostname are allowed. Add `127.0.0.1` too if you use that address.
4. Copy `.env.example` to `.env.local` in the project root. Fill in the Web app's `apiKey`, `authDomain`, `projectId`, and `appId` values as:

   ```dotenv
   VITE_FIREBASE_API_KEY=your-web-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_APP_ID=your-web-app-id
   ```

   Firebase Web app configuration is intended to be present in client apps; it is not a server secret. Do not put service-account private keys or Admin SDK credentials in this Vite app. Keep `.env.local` out of source control.
5. Stop and restart `npm run dev`, then visit `#/signup` to create an account. The Firebase project must have Email/Password enabled before sign-up can work.

Firebase client configuration alone does not create or enable a Firebase project. You must set up the project and provider in the Firebase console. This frontend uses Firebase's client SDK directly; additional application data that needs access control should be stored in Firebase services with appropriate Security Rules, not trusted based only on a signed-in UI.

## Project files

- `src/App.jsx` — landing, login, sign-up and dashboard views, client-side route navigation, demo datasets, and form/search states.
- `src/firebase.js` — initializes Firebase only when the required Vite environment settings are present.
- `src/App.css` — landing, authentication, dashboard styling and responsive layouts.
- `src/index.css` — global styles and accessibility defaults.
- `index.html` — page title and metadata.
- `.env.example` — blank template for the Firebase Web app settings; copy it to `.env.local` to configure the app.
