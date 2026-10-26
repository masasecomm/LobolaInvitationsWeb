# Lobola Invitation setup

The storefront and admin use Firebase Authentication and Cloud Firestore. The configured project is `lobolainvitation-643df`; the Firestore location selected for it is `africa-south1` (Johannesburg).

## Firebase Console setup

Complete these steps in the signed-in Firebase Console for the project:

1. In **Authentication → Sign-in method**, enable **Email/Password**. The app provides sign-in but no account-registration form; create the administrator account directly in the Authentication users list.
2. In **Firestore Database**, create the database in **`africa-south1`** if it has not already been created. The database location cannot be changed later.
3. Publish the rules from [`firestore.rules`](./firestore.rules). The repository also includes Firebase CLI configuration; from a terminal with Firebase CLI access, run:

   ```powershell
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

4. In Authentication, create the admin user and copy its **User UID**.
5. In Firestore, create a collection named `admins`, then create a document whose document ID is exactly that UID. Add a field such as `role` with the string value `admin`. The app verifies this membership before showing the dashboard, and Firestore rules independently enforce admin-only writes.

The `admins` document must be created through the Firebase Console (or trusted admin tooling); client-side writes to this collection are denied by the rules.

## Local environment

Copy `.env.example` to `.env.local` and enter the Firebase web app configuration from **Project settings → General → Your apps**. The registered web app config is already set in the local `.env.local` for this workspace; it is ignored by Git and must not be committed. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` for local development.

Install packages and run the app:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Visit `/admin` and sign in with the admin account. If Firebase Authentication reports that the domain is not authorized after deployment, add the deployed hostname under **Authentication → Settings → Authorized domains**.

## Catalog and template editing

Create template posts in the admin dashboard, assign a category, add search title/description, and choose draft or published status. Published products appear under `/product/<slug>` and have server-rendered metadata. Categories remain separate catalog groupings on the storefront and do not alter product URLs. Previous `/t/<slug>` links permanently redirect to the corresponding `/product/<slug>` URL. Use the **Design** action to edit the invitation template; visitors can open a published product and customize their own local copy.

Firestore documents are limited to 1 MiB. The app refuses to save a product/design document larger than 800 KiB to leave room for Firestore document overhead. Firebase Storage is not used: it is unavailable on this project's current Spark plan, so cover images should be provided as public image URLs. Designs that embed large image data may need those images replaced with smaller images or URLs.

Firebase web app configuration (including its API key) is public client configuration, not an authorization mechanism. Keep Firestore rules deployed and never treat an obscured client key as security. Admin authorization is based on the protected `admins/{uid}` membership document.

## Deploy

Deploy the Next.js app to a Node-compatible host and configure the same `NEXT_PUBLIC_FIREBASE_*` values and production `NEXT_PUBLIC_SITE_URL` there. Deploy Firestore rules and indexes to the same Firebase project. Do not upgrade the Firebase project to a paid plan unless that is separately approved.
