# 🚀 Deploy Monitor

One dashboard to monitor **GitHub Actions deployments** and **open pull requests** across all repositories of a project (FE, Admin, BE, ...).

- ✅ See which workflows are **running right now** across every repo (running jobs are pinned to the top)
- ✅ All **open PRs** in one place — author, branch, reviewers, draft status
- ✅ Sign in with GitHub (optionally restricted to your organization's members)
- ✅ **Per-user setup in the app**: each user picks the repositories to monitor and can optionally paste their own classic PAT (Settings page) — no redeploy needed
- ✅ Auto-refreshes every 15s + manual refresh button
- ✅ **Merge PRs right from the dashboard** (confirm dialog, choose merge/squash/rebase)
- ✅ Click any item to open it on GitHub

**Stack:** Next.js (App Router) · Auth.js v5 · Octokit · SWR · Tailwind + shadcn/ui · deployable on Vercel with zero infra (no database).

## Setup

### 1. Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → [OAuth Apps](https://github.com/settings/developers) → New OAuth App**
2. Fill in:
   - **Homepage URL:** `http://localhost:3000` (update later for production)
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Copy the **Client ID** and generate a **Client Secret**

> ⚠️ **Important for private org repos:** if your organization has **"OAuth App access restrictions"** enabled (most do), an org owner must **approve this OAuth app** for the org, otherwise the GitHub API returns 404 for private repos.
> Approve at: `https://github.com/organizations/<ORG>/settings/oauth_application_policy`, or request access when you first sign in.

### 2. Configure environment

```bash
cp .env.local.example .env.local
npx auth secret   # fills AUTH_SECRET, or paste output manually
```

Then edit `.env.local`:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret for session & settings-cookie encryption |
| `AUTH_GITHUB_ID` | OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | OAuth App Client Secret |
| `GITHUB_ORG` | *(optional)* Only members of this org can sign in (empty = allow anyone) |
| `GITHUB_ALLOWED_USERS` | *(optional)* Extra usernames allowed to sign in even if not org members (outside collaborators), comma-separated |

Repositories and data tokens are **not** configured via env — each user picks them on the **Settings** page after signing in.

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

### 4. Per-user setup (in the app)

After signing in, open **Settings**:

1. *(Optional)* Paste a [classic PAT](https://github.com/settings/tokens/new?scopes=repo&description=Deploy+Monitor) with `repo` scope — needed when your org blocks OAuth apps. The token is validated against GitHub, stored in an **encrypted httpOnly cookie**, and never sent back to the browser.
2. Pick the repositories to monitor from the list of repos your token can access (searchable), then **Save**.

Each user has their own token + repo selection, bound to their GitHub account.

## Deploy to Vercel

1. Push this repo to GitHub and import it on [vercel.com/new](https://vercel.com/new)
2. Add the same environment variables in **Project → Settings → Environment Variables**
3. After the first deploy, update the GitHub OAuth App (or create a separate one for production):
   - **Homepage URL:** `https://<your-app>.vercel.app`
   - **Authorization callback URL:** `https://<your-app>.vercel.app/api/auth/callback/github`

## How it works

```
Browser ──(SWR poll 15s)──> Next.js API routes ──(Octokit + user's OAuth token)──> GitHub API
                │
        Auth.js JWT session (GitHub token stays server-side, never sent to the browser)
```

- `/api/workflow-runs` — fetches the latest 10 runs per repo in parallel, merges & sorts (running first)
- `/api/pull-requests` — fetches open PRs per repo in parallel, sorted by last update
- `/api/repos` — lists repos the user's token can access (for the Settings picker)
- `/api/settings` — per-user config (optional PAT + selected repos) stored in an encrypted httpOnly cookie, bound to the GitHub account; the PAT is never returned to the client
- One failing repo doesn't break the dashboard — its error is shown inline
- Rate limit: each signed-in user uses their own token (5,000 req/h), polling 2 endpoints every 15s ≈ 480 req/h per user — well within limits. SWR pauses polling when the tab is hidden.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Repo shows "Not found" / "OAuth App access restrictions" error | OAuth app not approved for the org (see step 1). If approval isn't possible, paste a classic PAT with `repo` scope in **Settings** |
| Settings reset after switching browser/device | Settings live in an encrypted cookie per browser — re-select repos (or paste the PAT again) on the new device |
| "Access denied" on login | Your GitHub account is not a member of `GITHUB_ORG`. If you're an outside collaborator, add your username to `GITHUB_ALLOWED_USERS`. Re-authorizing is not needed — just sign in again after fixing the env |
| Login redirect loop in production | `AUTH_SECRET` missing on Vercel, or callback URL doesn't match the deployed domain |
