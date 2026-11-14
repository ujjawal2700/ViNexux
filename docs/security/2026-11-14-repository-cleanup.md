# Repository cleanup — 14 November 2026

Fetching GitHub showed `main` force-updated from clean `7179e70` to `d392897`.
The replacement retained the commit message but changed exactly six paths:
`.gitignore`, both package manifests, `backend/init`, `frontend/init`, and
`frontend/vite.config.js`. It reintroduced the previously documented startup
loaders and removed environment-file ignore rules. The fetched loaders were
not executed. The working tree was clean before synchronization.

The corrective merge retains the verified local tree, including the managed
brand changes in `bda0442`, while incorporating the remote commit as history.
It does not rewrite history: the unsafe historical commit remains reachable.

`scripts/check-repository-integrity.mjs` checks source signatures, forbidden
loader files, tracked environment files, ignore rules, startup/lifecycle commands,
and Vite configuration without executing project configuration. It can inspect
a commit with `--ref <commit>` or staged files with `--ref :`. It passes against
the clean tree and rejects the fetched malicious revision.

Tracked pre-commit/pre-push hooks run the check against staged/pushed content.
Enable them in additional clones with `git config core.hooksPath .githooks`.
GitHub Actions runs the same dependency-free check on pushes and pull requests.
These controls cover the observed injection pattern; they are not a general
malware scanner. Users with access to change protections can bypass controls.

The GitHub API reported that `main` had no branch protection and the current
credential had repository administrator permission. The repeated force updates
make reviewing GitHub account sessions, tokens, collaborators, deploy keys and
installed integrations necessary. Revoke unrecognized access and rotate exposed
credentials from a trusted device. This cleanup does not identify the writer,
certify the host is clean, or rotate credentials.
