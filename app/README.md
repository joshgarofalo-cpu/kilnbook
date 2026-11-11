# Kilnbook app

The real app: a phone web app on Vite and plain JavaScript, with Supabase as the database and Cloudflare Pages for hosting. The pitch demo in `../demo` is separate and stays as it is.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The page shell. Links the phone-app manifest and Home Screen icon. |
| `src/main.js` | Start-up: setup screen, sign-in, or the app with its tabs. |
| `src/views/` | One file per screen: `login`, `inventory`, `pickups`, `setup`. |
| `src/styles.css` | Same colors and fonts as the demo. |
| `src/supabase.js` | The database connection. |
| `supabase/schema.sql` | All the tables and security rules. Run once. |
| `supabase/seed.sql` | Sample pieces and two tickets, for trying it out. |
| `public/` | Home Screen icons, app manifest, and the service worker (`sw.js`). |
| `scripts/make-icons.mjs` | Redraws the PNG icons (`npm run icons`). |

## One-time setup

You'll need [Node.js](https://nodejs.org) (already installed), a free [Supabase](https://supabase.com) account, and a free [Cloudflare](https://dash.cloudflare.com) account.

### 1. Make the database

1. In Supabase, create a new project (any name, e.g. `kilnbook`). Pick a region near Virginia (US East).
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**.
3. Go to **Authentication → Users → Add user → Create new user**. Enter your email, tick **Auto confirm**, and save. (The app only lets in people added here.)
4. Open `supabase/seed.sql`, change `you@example.com` to the email from step 3, then paste it into a new SQL query and **Run**.

### 2. Tell Supabase where the app lives

Until custom email is set up (step 5), Supabase sends its stock sign-in email, which has a **link** and no code. Clicking that link opens the app's address. Supabase needs to know that address.

In **Authentication → URL Configuration**:
- Set **Site URL** to `http://localhost:5173`. Change it to your `*.pages.dev` address once it's online (step 4).
- Under **Redirect URLs**, add `http://localhost:5173`.

**Later, once custom SMTP is connected (step 5):** switch the email to a 6-digit code. On iPhone, a Home Screen app keeps its own login separate from Safari, so a link signs you in to Safari and not the app. A typed code works everywhere. Supabase only lets you edit the email after SMTP is connected. In **Authentication → Emails → Templates → Magic Link**, replace the body with:

```html
<h2>Your Kilnbook code</h2>
<p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
```

### 3. Run it on your computer

1. Copy `.env.example` to `.env.local`.
2. In Supabase, **Project Settings → API Keys**: copy the **publishable** key. **Project Settings → Data API**: copy the project URL. Paste both into `.env.local`.
3. In this folder:

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (http://localhost:5173), enter your email, then click the link in the email you get. You should see the sample inventory.

### 4. Put it online (Cloudflare Pages)

1. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, and pick the `kilnbook` repo.
2. Build settings:
   - Framework preset: **None**
   - Root directory: `app`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Under **Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` with the same values as `.env.local`.
4. Deploy. Every push to `main` redeploys automatically.
5. In Supabase, **Authentication → URL Configuration**, set **Site URL** to your new `*.pages.dev` address and add it under **Redirect URLs**.

### 5. Add someone else (Jessie, Risa)

Add them under **Authentication → Users** (step 1.3), then run this in the SQL Editor with their email:

```sql
insert into studio_members (studio_id, user_id)
select s.id, u.id from studios s, auth.users u
where s.name = 'Sample Pottery Studio' and u.email = 'their@email.com';
```

**Before they use it:** Supabase's built-in email only delivers to people on your Supabase team, and only a few emails an hour. To send codes to anyone else, connect a real email service under **Project Settings → Authentication → SMTP Settings**. [Resend](https://resend.com) has a free tier that works for this. It needs a domain you own to send to other people. Once it's connected, do the code-email change at the end of step 2.

## On their iPhones

Open the site in **Safari**, tap **Share → Add to Home Screen**. It then opens full-screen like an app. Push alerts (low stock) will only work from the Home Screen version, which is an Apple rule.

## How the security works, briefly

The app talks to the database straight from the phone, so the publishable key is visible to anyone who looks. That's normal for Supabase. What protects the data is row-level security in `schema.sql`: every row has a `studio_id`, and the database only returns rows for studios the signed-in person belongs to. Never put the **secret** (service_role) key in this app.
