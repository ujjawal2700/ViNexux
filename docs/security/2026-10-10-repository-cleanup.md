# Repository injection cleanup — 10 October 2026

## Confirmed findings

The incoming `origin/main` commit `152e23e70b00f535e559d8de314de38328dcbf1d`
contains three changes relative to the clean local commit `1a11cac`:

- An obfuscated script appended after the Vite configuration, concealed with tabs,
  plus a `createRequire` bridge.
- A new, obfuscated `backend/api.js` loader.
- Backend `start` and `dev` commands altered to execute that loader first.

Static decoding of the Vite payload (without evaluating it) showed remote code
retrieval via Ethereum RPC/indexer services, followed by `eval` and detached Node
execution. A running inline Node process matched the loader's global-variable
signature and referenced the remote host `193.247.144.38`. That process and the
Vite dev server that launched it were stopped. The origin of the GitHub change
and the behavior of any remotely retrieved second-stage code are not established.

## Cleanup

Removed the injected file, restored the clean Vite configuration and backend
startup commands, and resolved the interrupted footer merge preserving the new
red hover styles. Recent banner, sorting and Trending changes are retained.
`tests/unit/repositoryIntegrity.test.js` adds static checks for the observed
injection patterns, hidden whitespace, startup changes and conflict markers.
These checks detect the observed patterns; they are not a general malware scanner.

Original payloads and static decoding evidence were saved as inert `.txt` files
under `/private/tmp/vinexus-*`, outside the repository. Payload SHA-256 values:

- Vite configuration: `2bac589005d76ef1fbfe8663f84cedaac71d06c29e61031926a879f4358c2d1d`
- Backend loader: `cd142a0e9fba1c65d31d5bb1e66d81a3714ec1877a5705ed0a95e31f85d40f72`

## Required follow-up outside the code cleanup

Because execution was observed, rotate credentials available to the affected
process, including local backend/frontend environment secrets and GitHub access
credentials. Review GitHub account sessions, repository collaborators, deploy
keys, webhooks and deployment activity. Rotate deployment secrets if a deployment
built or started the affected commit. Use a trusted device for credential changes.
The repository cleanup does not certify the host is free of persistence or prove
that credentials were not copied.

The corrective merge preserves Git history. The contaminated commit remains in
history and must not be checked out and run. Removing historical copies requires
a separately coordinated history rewrite, including other branches and clones.
