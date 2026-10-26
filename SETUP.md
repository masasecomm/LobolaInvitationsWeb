# Lobola Invitation setup

The storefront and admin use Firebase Authentication and Cloud Firestore. The configured project is `lobolainvitation-643df`; the Firestore location selected for it is `africa-south1` (Johannesburg).

## Firebase Console setup

Complete these steps in the signed-in Firebase Console for the project:

1. In **Authentication → Sign-in method**, enable **Email/Password** for admin sign-in and customer accounts.
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

In the admin dashboard, choose **Create a template post** or **Create a blog post** to open the matching form. Published blog articles appear at `/blog/<slug>` with canonical metadata, Open Graph and Twitter tags, `BlogPosting` structured data, and a sitemap entry. Blog summaries, article text, SEO titles, and SEO descriptions are validated before saving.

Each template has a required price in South African rand. The website displays that price, but payment processing is not connected. Visitors must create an email/password account, confirm the Firebase email link, then sign in before the template editor appears. Visitor edits stay in their browser and cannot save changes to the published template. Add the production hostname under **Authentication → Settings → Authorized domains** so verification links can return to the site.

Visitors must submit a 1–5 star rating and written comment before downloading a published invitation design or print PDF. The admin editor is exempt. Reviews are stored in the `reviews` collection and displayed with Product, Review, and AggregateRating structured data based only on submitted reviews; no rating markup is emitted until real reviews exist. Public reviews are anonymous unless the visitor chooses to provide a display name.

After updating Firestore rules and indexes, deploy them to Firebase so public review submission, blog access, and blog/product URLs work:

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

The review rule validates the product, rating, display name, comment length, and server timestamp. It allows public review submissions; configure Firebase App Check or add another anti-spam control if the site begins receiving abusive submissions.

The admin sign-in form uses Cloudflare Turnstile site key `0x4AAAAAAFbXDbZY4AJ5gGSD`. Set the matching Turnstile **secret key** as `TURNSTILE_SECRET_KEY` in the server environment for local use and in Vercel's Production/Preview environments. Never use a `NEXT_PUBLIC_` prefix for this secret. Admin sign-in is denied if Turnstile server verification is not configured or fails. The API verifies the token with Cloudflare and checks the returned hostname.

## Uploading template covers

The template form accepts JPEG, PNG, or WebP cover images up to 4 MB. When the template is saved, its cover is committed to `public/Admin Template Covers/<template-slug>-cover.<extension>` in the `masasecomm/LobolaInvitationsWeb` GitHub repository. A commit to `main` triggers the connected Vercel deployment; the saved product uses the site's own image path, avoiding third-party image hosts that block embedding. The directory is tracked in Git with `.gitkeep`.

To enable uploads in Vercel:

1. Create a **fine-grained personal access token** in GitHub. Select resource owner `masasecomm`, restrict repository access to `LobolaInvitationsWeb`, and grant only **Contents: Read and write** repository permission.
2. In the Vercel project, add the token as the server-only environment variable `GITHUB_CONTENTS_TOKEN` for Production (and any other environment where you want uploads enabled). Do not prefix it with `NEXT_PUBLIC_`, commit it, or share it in chat.
3. Redeploy the project so the environment variable is available to the upload API.

The upload API requires a valid Firebase ID token and independently checks the caller's `admins/{uid}` document through Firestore before it writes to GitHub. A missing GitHub token, invalid image, or insufficient repository permission produces an explicit error. Replacing a cover for the same slug and image type updates that file in GitHub. Firebase Storage is not used, so cover uploads do not require upgrading the Firebase Spark plan.

Firestore documents are limited to 1 MiB. The app refuses to save a product/design document larger than 800 KiB to leave room for Firestore document overhead. Designs that embed large image data may need those images replaced with smaller images or URLs.

Firebase web app configuration (including its API key) is public client configuration, not an authorization mechanism. Keep Firestore rules deployed and never treat an obscured client key as security. Admin authorization is based on the protected `admins/{uid}` membership document.

## Deploy

Deploy the Next.js app to a Node-compatible host and configure the same `NEXT_PUBLIC_FIREBASE_*` values and production `NEXT_PUBLIC_SITE_URL` there. Deploy Firestore rules and indexes to the same Firebase project. Do not upgrade the Firebase project to a paid plan unless that is separately approved.
