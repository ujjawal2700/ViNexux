# Pre-push security review — 8 November 2026

## Confirmed malicious incoming revision

The fetched `origin/main` revision `7b20cb0` had diverged from the local branch. Its differences from the equivalent clean SEO commit `5a7c418` were confined to `.gitignore`, two package files, two new extensionless `init` files, and the Vite configuration.

Static decoding identified a loader that resolved remote payload locations, downloaded code, evaluated it, and launched detached Node processes. The suspect code was not executed during this review. The clean merge `be11bb7` rejects both `init` files, the appended Vite payload, and the commands that invoked them. Environment-file ignore rules were restored. Website changes were preserved.

A second fetch found another force-updated revision, `aa733c1`. Compared with `7b20cb0`, it changes only the two malicious loader files. Those files were again rejected while merging the latest remote history.

## Additional cleanup

- Removed the obsolete `scratch/setup_env_credentials.js` script, which contained hardcoded credentials and could overwrite environment configuration.
- Removed a hardcoded database connection fallback from `backend/update_stock_for_testing.mjs`. It now requires `MONGODB_URI` and rejects production execution. It was not run during this review.
- Applied compatible dependency security updates in all three lockfiles, with dependency lifecycle scripts disabled.
- Extended static regression checks for unexpected startup commands, loader files, environment-file ignore rules, and the removed credential script.

## Remaining dependency advisories

The final npm audits report:

| Dependency tree | Critical | High | Moderate | Low |
| --- | ---: | ---: | ---: | ---: |
| Storefront/admin frontend | 0 | 0 | 0 | 0 |
| Backend | 0 | 1 | 5 | 0 |
| Root test tooling | 0 | 0 | 16 | 3 |

The backend high-severity finding is [Zod resource exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5); npm recommends Zod 4.6.7, a major upgrade from this application's Zod 3 schemas. That migration was not forced into this security cleanup. The backend also retains transitive findings involving `gaxios`, `gcp-metadata`, `glob`, `minimatch`, and `rimraf`. The root findings concern Jest's dependency tree. These remain unresolved and should be addressed in a tested dependency migration. npm's suggested forced root fix downgrades Jest across major versions, so it was not applied.

## Verification

- Unit suites and mocked API suites pass after compatible dependency updates.
- 47 Chromium checks pass against the production build, covering reports, employee access, storefront controls, banner media, Clarity, SEO, variants, homepage decoration, and PWA behavior.
- Frontend build and lint complete successfully; existing size and lint warnings remain.
- Reviewed tracked source/configuration for obfuscated-loader signatures, dynamic execution, unexpected subprocess use, credential patterns, non-registry lockfile sources, conflict markers, and unexpected lifecycle hooks. No further matching loader was found. This is a scoped review, not proof that all code or dependencies are free of vulnerabilities.
- Tests use mocks/local servers. No production database cleanup, provider-credential test, or business-data script was run.

## Required follow-up outside this push

Rotate the database, Cloudinary, signing, and administrator credentials present in the old setup scripts. Removing files does not remove credentials from Git history. If the malicious incoming revision was built or started on any machine, treat credentials accessible to that machine as potentially exposed, investigate that machine and deployment, and rebuild from a trusted clean checkout. Review GitHub account/repository access and the origin of the force-updated revision.

This normal merge/push preserves Git history, including the malicious historical revision. Do not check out or execute that revision. History rewriting and production credential rotation were not performed as part of this push.

## Subsequent performance-work sync

The final fetch before the performance push found `origin/main` force-updated from the previously verified clean `8613fc4` to `4b9f912`, with the same commit message. The only tree differences were the same six injection-related paths: `.gitignore`, the two package files, the two `init` files, and `frontend/vite.config.js`. The malicious changes were again rejected in a clean merge, and repository integrity tests rerun. The source of these repeated branch replacements remains unresolved; repository/account access requires investigation.

During the mobile performance follow-up, `origin/main` was again replaced with `e0a7f47`, carrying the same message as clean `6ae97b1` and differing only in the same six malicious injection paths. These changes were rejected again; the VPS deployment uses an explicitly pinned reviewed commit rather than blindly deploying the remote branch.
