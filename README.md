# 𝚂𝚊𝚖𝚞𝚎𝚕~ — Vebhav · Portfolio + Admin Panel

A cinematic, fully admin-controlled portfolio site for a video editor / creative artist.
Built with **Vite** (so real `.env` files work and Vercel auto-detects everything —
no manual "Root Directory" configuration needed), using:

- **Firebase** (Firestore + Authentication) — free, for content storage and admin login
- **Cloudinary** — free, for photo/video hosting

```
𝚂𝚊𝚖𝚞𝚎𝚕~-portfolio/
├── index.html                  ← Vite entry point (public + admin, one page, hash-routed)
├── package.json
├── vite.config.js
├── .env.example                 ← copy to .env and fill in your real keys
├── .gitignore                   ← .env, node_modules, dist are never committed
├── firestore.rules
└── src/
    ├── css/styles.css
    ├── firebase-config.js       ← reads from .env — do not hardcode keys here
    ├── firebase-init.js
    ├── cloudinary-config.js     ← reads from .env
    ├── data.js                  ← Firestore + Auth + Cloudinary upload helpers
    ├── render-public.js          ← public site rendering
    ├── render-admin.js           ← admin panel (CRUD, draft/publish)
    └── main.js                    ← boot + routing
```

The public site is at `/`. The admin panel is at `/#admin`.

---

## 1. Create a Firebase project (free — no card needed)

1. https://console.firebase.google.com → **Add project** → name it (e.g. `𝚂𝚊𝚖𝚞𝚎𝚕~-portfolio`) → finish setup.
2. Left sidebar: **Build → Firestore Database** → **Create database** → **production mode** → pick a nearby region.
3. **Build → Authentication** → **Get started** → enable the **Email/Password** provider.
4. **Build → Authentication → Users** tab → **Add user** → your own email + a strong password. This is your one admin login — no public sign-up form, by design.

## 2. Create a Cloudinary account (free — no card needed)

1. https://cloudinary.com/users/register/free
2. Dashboard → copy your **Cloud name**.
3. Settings (gear icon) → **Upload** tab → **Upload presets** → **Add upload preset** → Signing Mode = **Unsigned** → Save → copy the preset's name.

## 3. Set up your environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in every value — your Firebase config (from Project settings → General → Your apps → SDK setup) and your Cloudinary cloud name + upload preset:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

`.env` is in `.gitignore` — it will **never** be pushed to GitHub. That's intentional; see step 6 for how production gets these values instead.

## 4. Apply the Firestore security rules

Firestore Database → **Rules** tab → paste in the contents of `firestore.rules` → **Publish**.
This means: anyone can *view* your content (so the site works for visitors), but only your signed-in admin account can *write* changes.

## 5. Run it locally

```bash
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Visit `http://localhost:5173/#admin` to log in and add your first content.

## 6. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Because `.env` is git-ignored, your secret-ish keys won't be in the repo — which is correct. Vercel needs its own copy of them (next step).

**Important:** push the contents of this folder to the repo *root* — don't wrap it in another folder first. `package.json` needs to sit at the top level of the repo for Vercel to auto-detect it as a Vite project.

## 7. Deploy to Vercel

1. https://vercel.com → **Add New → Project → Import Git Repository** → select your repo.
2. Vercel auto-detects **Vite** as the framework — leave Build Command (`vite build`) and Output Directory (`dist`) as the defaults it suggests. You do **not** need to set a Root Directory.
3. Before clicking Deploy, open **Environment Variables** and add every key from your `.env` file, one by one (same names, same values):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.
4. Click **Deploy**. You'll get a live URL like `https://your-project.vercel.app`.

(If you ever change a value later: Project → Settings → Environment Variables → edit → then Deployments → redeploy, since env vars are baked in at build time.)

## 8. Authorize your Vercel domain in Firebase

Firebase blocks sign-in from domains it doesn't recognize:
Firebase Console → Authentication → **Settings** tab → **Authorized domains** → **Add domain** → paste your Vercel URL.

## 9. Start editing

Go to `https://your-project.vercel.app/#admin`, log in with the account from step 1.4, and fill in Hero, Work, Collabs, Work Info, New Launch, Currently Working On, Social Links and Email. Nothing is public until you press **Publish**.

---

## Free-tier limits at a glance (Aug 2026)

| Service | Free limit | Notes |
|---|---|---|
| Vercel Hosting | 100GB/month bandwidth | Personal use only |
| Firestore (content) | 1GB stored, 50K reads/day, 20K writes/day | No card needed |
| Firebase Auth | 50,000 monthly active users | Way more than one admin needs |
| Cloudinary (media) | 25 credits/month (~25GB storage+bandwidth combined) | No card needed |

## Troubleshooting

- **"Firebase is not configured"** toast in the admin panel → your `.env` (locally) or Environment Variables (on Vercel) are missing or misspelled — variable names must start with `VITE_` exactly as shown above, or Vite won't expose them to the browser.
- **404 on Vercel** → almost always means `package.json` isn't at the repo root. Check your repo's homepage on GitHub — you should see `package.json`, `index.html`, `src/`, etc. directly, not inside another folder.
- **Admin login fails** → confirm the user exists under Firebase → Authentication → Users, and that your deployed domain is in Firebase's Authorized domains (step 8).
