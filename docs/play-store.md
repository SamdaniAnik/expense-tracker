# Publish Ledger on Google Play

Ledger’s Android app is a **Capacitor** shell that loads the live site  
`https://personal-costing-app.vercel.app` (override with `NEXT_PUBLIC_APP_URL`).

## 1. Create a Google Play Developer account ($25 one-time)

1. Open [play.google.com/console](https://play.google.com/console).
2. Sign in with a Google account.
3. Pay the **$25** registration fee and complete identity verification.
4. Accept the developer distribution agreement.
5. When the console is ready, create an app named **Ledger**.

You cannot upload an AAB until this account is active (verification can take hours to a few days).

## 2. Install Android Studio (Windows)

1. Install [Android Studio](https://developer.android.com/studio).
2. Open **SDK Manager** and install a recent Android SDK + build-tools.
3. Accept licenses if prompted.

## 3. Open the Android project

From the repo root (Node **22+** required for Capacitor CLI 8):

```bash
npm install
npx cap sync android
npx cap open android
```

Or: `npm run android:open`

## 4. Change the live URL (if needed)

Default server URL is set in [`capacitor.config.ts`](../capacitor.config.ts):

```bash
# PowerShell
$env:NEXT_PUBLIC_APP_URL="https://personal-costing-app.vercel.app"
npx cap sync android
```

Also add `NEXT_PUBLIC_APP_URL` in Vercel for documentation consistency.

## 5. Build a signed Android App Bundle (AAB)

1. In Android Studio: **Build → Generate Signed App Bundle / APK**.
2. Choose **Android App Bundle**.
3. Create a new keystore (or use an existing one):
   - Store the `.jks` / `.keystore` file and passwords somewhere safe.
   - **Losing the upload key blocks future updates.**
4. Build a **release** AAB.
5. Output is typically under `android/app/release/` or the path Android Studio shows.

Do **not** commit the keystore or `key.properties`.

## 6. Play Console listing checklist

In Play Console → your **Ledger** app:

| Field | Suggested value |
| --- | --- |
| App name | Ledger |
| Short description | Track spending, budgets, and split tour expenses. |
| Full description | Personal finance tracker with accounts, budgets, recurring bills, household sharing, and Splitwise-style tour splits. |
| App icon | Use indigo “L” launcher (already in the Android project) |
| Feature graphic | 1024×500 image (create in any design tool) |
| Screenshots | Phone screenshots of Home, Tours, Budgets (at least 2) |
| Privacy policy URL | `https://personal-costing-app.vercel.app/privacy` |
| Category | Finance |
| Contact email | Your support email |

Complete **Data safety**, **Content rating**, and **Target audience** questionnaires (finance / personal data).

## 7. Upload and release

1. **Testing → Internal testing** → create a release → upload the `.aab`.
2. Add yourself as a tester, install from the Play opt-in link, verify login and tours.
3. When happy, promote the release to **Production** (or Closed testing first).
4. Submit for review. First review often takes 1–7 days.

## 8. Privacy policy

Hosted at `/privacy` on the live site. Keep it updated if you change data practices.

## Troubleshooting

- **Blank WebView:** check device internet; confirm `server.url` is HTTPS and online.
- **Login cookie issues:** ensure Supabase Auth site URL / redirect allowlist includes your Vercel domain.
- `cap sync` fails with Node version: use Node 22+ (`nvm use 22`).
