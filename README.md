# 🚀 Deploy Monitor

One dashboard to monitor **GitHub Actions deployments** and **open pull requests** across all repositories of a project (FE, Admin, BE, ...).

- ✅ See which workflows are **running right now** across every repo (running jobs are pinned to the top)
- ✅ All **open PRs** in one place — author, branch, reviewers, draft status
- ✅ Sign in with GitHub (restricted to your organization's members)
- ✅ Auto-refreshes every 15s + manual refresh button
- ✅ Read-only — click any item to open it on GitHub

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
| `AUTH_SECRET` | Random secret for session encryption |
| `AUTH_GITHUB_ID` | OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | OAuth App Client Secret |
| `GITHUB_ORG` | Only members of this org can sign in (empty = allow anyone) |
| `GITHUB_ALLOWED_USERS` | Extra usernames allowed to sign in even if not org members (outside collaborators), comma-separated |
| `GITHUB_REPOS` | Comma-separated repos to monitor, e.g. `myorg/fe,myorg/admin,myorg/be` |
| `GITHUB_TOKEN` | *(optional)* Classic PAT (scope `repo`) used to fetch data instead of each user's OAuth token — workaround when the org's OAuth App access restrictions can't be lifted. Classic PATs are not affected by that restriction |

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

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
- One failing repo doesn't break the dashboard — its error is shown inline
- Rate limit: each signed-in user uses their own token (5,000 req/h), polling 2 endpoints every 15s ≈ 480 req/h per user — well within limits. SWR pauses polling when the tab is hidden.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Repo shows "Not found" / "OAuth App access restrictions" error | OAuth app not approved for the org (see step 1), or repo name typo in `GITHUB_REPOS`. If approval isn't possible, set `GITHUB_TOKEN` to a classic PAT with `repo` scope |
| "Access denied" on login | Your GitHub account is not a member of `GITHUB_ORG`. If you're an outside collaborator, add your username to `GITHUB_ALLOWED_USERS`. Re-authorizing is not needed — just sign in again after fixing the env |
| Login redirect loop in production | `AUTH_SECRET` missing on Vercel, or callback URL doesn't match the deployed domain |
