# 🚀 Deploy Monitor

One dashboard to monitor **GitHub Actions deployments** and **open pull requests** across all repositories of a project (FE, Admin, BE, ...).

- ✅ See which workflows are **running right now** across every repo (one column per repo)
- ✅ All **open PRs** in one place — author, branch, reviewers, draft & conflict status
- ✅ **Merge or close PRs right from the dashboard** (confirm dialog, choose merge/squash/rebase)
- ✅ Sign in with a GitHub **personal access token** — no OAuth app to register
- ✅ Per-user repo selection in the app's Settings page
- ✅ Auto-refreshes every 15s + native desktop notifications for new/merged PRs
- ✅ Collapsible sidebar, per-repo color coding, user hover cards

**Stack:** Next.js (App Router) · Octokit · SWR · Tailwind + shadcn/ui · deployable on Vercel with zero infra (no database, no OAuth app).

## Setup

### 1. Configure environment

```bash
cp .env.local.example .env.local
openssl rand -base64 32   # paste into AUTH_SECRET
```

Only one variable is required:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret used to encrypt the session & settings cookies |

### 2. Run

```bash
npm install
npm run dev   # http://localhost:3110
```

### 3. Sign in

1. Create a [classic personal access token](https://github.com/settings/tokens/new?scopes=repo&description=Deploy+Monitor) with the `repo` scope
   - ⚠️ Must be a **classic** token — fine-grained PATs are subject to org approval policies; classic PATs are not affected by "OAuth App access restrictions"
2. Paste it on the login page — the app validates it against GitHub, resolves your identity, and stores it in an **encrypted httpOnly cookie** (AES-256-GCM, 30 days). The token is never sent back to the browser.
3. Open **Settings** and pick the repositories to monitor (searchable list of repos your token can access, or add `owner/repo` manually).

Each user signs in with their own token and has their own repo selection, bound to their GitHub account.

## Deploy to Vercel

1. Push this repo to GitHub and import it on [vercel.com/new](https://vercel.com/new)
2. Add `AUTH_SECRET` in **Project → Settings → Environment Variables**
3. Deploy — that's all (no callback URLs, no OAuth credentials)

## How it works

```
Browser ──(SWR poll 15s)──> Next.js API routes ──(Octokit + user's PAT)──> GitHub API
                │
   Encrypted httpOnly session cookie (PAT stays server-side, never in the browser)
```

- `/api/auth/login` — validates the PAT against `GET /user`, creates the encrypted session
- `/api/workflow-runs` — latest 10 runs per repo in parallel, merged & sorted (running first)
- `/api/pull-requests` — open PRs per repo in parallel + one GraphQL query for conflict status (`mergeable`)
- `/api/repos` — repos the token can access (for the Settings picker)
- `/api/merge`, `/api/close-pr` — PR actions with GitHub's error messages surfaced
- One failing repo doesn't break the dashboard — its error is shown inline in its column
- Notifications: a service worker shows native notifications for new/merged/closed PRs while the tab is open (toggle in the sidebar)
- Rate limit: each user's own PAT (5,000 req/h); polling ≈ 500 req/h per user — well within limits

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Token is invalid or expired" at login | Token revoked/expired or has no `repo` scope — generate a new classic PAT |
| Repo shows "Not found" error | Token's account has no access to that repo, or repo name typo |
| Settings/login reset after switching browser/device | Sessions live in encrypted cookies per browser — sign in again on the new device |
| No desktop notifications | Enable the sidebar toggle, then check macOS System Settings → Notifications → your browser; keep the tab open |
