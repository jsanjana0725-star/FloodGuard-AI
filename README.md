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

- **India-wide location search:** the top search box accepts any **city, district, or state/UT in India** (for example *Pune*, *Wayanad*, *Telangana*). The location list is bundled with the app (`src/data/india-locations.json` — 36 states/UTs, 649 districts, ~7,700 cities and towns), so search works offline and needs no API key or paid service.
- **Sample readings are limited to five demo cities.** Searching **Vijayawada**, **Mumbai**, **Chennai**, **Bengaluru**, or **Delhi** switches to the illustrative sample dataset. Any other location resolves and is displayed, but weather, risk, map, and alert panels stay empty with an explicit "no sample data" message — the app never invents readings for unlisted locations.
- Submitting an unknown place, an empty search, or hitting a network problem while loading the location list each shows a distinct error message. The search hint row also shows a loading state while the list is being fetched.
- The rainfall, weather, risk, trend, map, and alert values are examples only; no live lookup or prediction is performed. A live weather forecast is not connected.
- To regenerate the location index from upstream data, run `node scripts/build-location-index.mjs <path-to-source.json>` (source: [prasad-gowda/india-state-district-cities](https://github.com/prasad-gowda/india-state-district-cities), derived from citypopulation.de / Census of India).

## Public dashboard (no login)

- The dashboard is the default view and is fully public — no sign-in is required. Opening the app (root or `#/`) shows the live flood-risk dashboard directly.
- The marketing landing page remains available at `#/landing`, and optional Firebase login/sign-up remain at `#/login` and `#/signup` for anyone who wants an account. They are not required to use the dashboard.

## Flood-risk engine, data sources, and limitations

- **Weather:** [Open-Meteo](https://open-meteo.com/) forecast API (no API key). Provides current conditions, hourly precipitation, and a multi-day precipitation forecast. The last-updated timestamp is shown in the dashboard.
- **Official warnings:** India Meteorological Department (IMD) district-wise colour warnings, published as a public GIS layer on IMD's GeoServer. Colour meanings follow IMD: red = warning/take action, orange = alert/be prepared, yellow = watch/be updated, green = no warning. The source and issue timestamp are shown whenever warnings are available.
- **Risk categories:** Low, Moderate, High, Severe. The 24-hour rainfall classes reuse the IMD public rainfall-intensity classification. The score weights and the 72-hour accumulation bands are **provisional design choices** and are labelled as such in the UI.
- **This is a transparent, rules-based heuristic — not a validated AI model or flood forecast.** It has not been calibrated against historical flood records. A weather-based estimate is never presented as an official warning or a confirmed flood event, and official IMD warnings are always shown separately with their source and timestamp.
- **Missing, stale, or unavailable data is never replaced with demo values.** If live weather is missing, stale (older than 2 hours), or lacks rainfall inputs, no risk score is shown and the reason is explained. If official warnings cannot be reached, that is stated explicitly rather than inventing alerts.
- **Tests:** `npm test` runs the engine unit tests (`node --test`) covering normal conditions, heavy rainfall, missing data, stale data, and official-warning handling.

## Optional Firebase authentication

- Login and sign-up are available at `#/login` and `#/signup`. With Firebase configured, they create accounts, sign in, and send password-reset emails through Firebase Authentication. The app never writes passwords to browser storage; Firebase handles credential exchange and authentication session tokens.
- The login **Remember me** checkbox selects Firebase's local session persistence. When unchecked, the session uses session persistence. These settings control Firebase's sign-in session, not password storage.
- These pages are optional; the dashboard itself requires no account.

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

- `src/App.jsx` — public dashboard view, client-side route navigation, India-wide location search, and form/search states.
- `src/services/weatherService.js` — Open-Meteo geocoding, live weather fetch, and rolling rainfall windows (last/next 24/48/72 h).
- `src/services/warningsService.js` — IMD official district warning lookup (with a dev/preview proxy) that never fabricates warnings.
- `src/risk/floodRiskEngine.js` — reusable, dependency-free rules-based flood-risk scoring module (categories, factors, safety guidance, limitations).
- `tests/floodRiskEngine.test.js` — engine unit tests (`node --test`).
- `src/firebase.js` — initializes Firebase only when the required Vite environment settings are present (optional).
- `src/data/india-locations.json` — bundled India location index (states, districts, cities) used by the dashboard search; rebuilt with `scripts/build-location-index.mjs`.
- `src/App.css` — landing, authentication, dashboard styling and responsive layouts.
- `src/index.css` — global styles and accessibility defaults.
- `index.html` — page title and metadata.
- `.env.example` — blank template for the Firebase Web app settings; copy it to `.env.local` to configure the app.
