# Security Review Gate 1

GitHub Actions is not a dependency of this gate. Gate 1 is executed from an
ephemeral clean clone and a container image built without cache.

## Fixed environment

- Node.js: `24.14.0`
- Base image: `node:24.14.0-bookworm`
- Dependency installation: `npm ci` only
- Container runtime: Docker or Podman
- Runtime network: disabled
- Secrets: none
- Persistent volumes: none

The build context excludes local `node_modules`, build output, environment
files, npm configuration, and logs. The repository metadata is copied so the
container can execute `git diff --exit-code`.

## Reproduce

Run this command from any checkout of the repository. Supply the full commit
SHA that must be reviewed:

```sh
./scripts/run-security-gate.sh <40-character-commit-sha>
```

The script automatically uses Docker when it is available. To use Podman:

```sh
CONTAINER_ENGINE=podman ./scripts/run-security-gate.sh <40-character-commit-sha>
```

The script performs these operations:

1. clones `https://github.com/xolosArmy/tonalli-core.git` into a temporary
   directory;
2. checks out the exact commit in detached mode and verifies a clean worktree;
3. builds `Dockerfile.security` with `--no-cache --pull`;
4. runs the image with `--rm --network=none` and no volume mounts;
5. records complete stdout and stderr in
   `/tmp/tonalli-security-gate/tonalli-core-security-gate-<commit>.log`;
6. writes the log digest beside it as `<log>.sha256`.

The container executes:

```sh
npm test
npm run typecheck
rm -rf /workspace/dist
npm run build
test -s dist/index.js
test -s dist/index.cjs
test -s dist/index.d.ts
test -s dist/index.d.cts
npm pack --dry-run
git diff --exit-code
```

The `dist` removal is confined to the ephemeral container and ensures the ESM,
CJS, and declaration files are produced by the tested build.

## Approval and invalidation

A Gate 1 approval is valid only for the exact PR head commit named in the
evidence. The PR must remain draft and must not be merged until a top-level
review comment contains the standalone text:

`SECURITY GATE 1: APPROVED`

Any new commit invalidates that approval. The clean-clone container gate must be
repeated, a new log and SHA-256 must be published, and approval must be issued
again for the new head.

The evidence comment must include the exact commit, base image, commands, full
log, log SHA-256, and a file-to-risk-to-test-to-result matrix.

## Scope boundary

This gate reviews only the canonical contract and fail-closed boundaries in
this PR. It does not activate Tonalli Wallet, x402-XEC, signing, broadcast,
Chronik, the Golden Path, Commerce Relay, or A2/A3 autonomy.
