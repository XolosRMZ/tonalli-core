#!/usr/bin/env bash
set -Eeuo pipefail

readonly ACTUAL_COMMIT="$(git -c safe.directory=/workspace rev-parse HEAD)"

echo "container_repository=tonalli-core"
echo "container_commit=${ACTUAL_COMMIT}"
echo "container_base_image=node:24.14.0-bookworm"
echo "node_version=$(node --version)"
echo "npm_version=$(npm --version)"

echo "+ npm test"
npm test

echo "+ npm run typecheck"
npm run typecheck

echo "+ rm -rf /workspace/dist"
rm -rf -- /workspace/dist

echo "+ npm run build"
npm run build

echo "+ test -s dist/index.js"
test -s dist/index.js
echo "+ test -s dist/index.cjs"
test -s dist/index.cjs
echo "+ test -s dist/index.d.ts"
test -s dist/index.d.ts
echo "+ test -s dist/index.d.cts"
test -s dist/index.d.cts

echo "+ npm pack --dry-run"
npm pack --dry-run

echo "+ git diff --exit-code"
git -c safe.directory=/workspace diff --exit-code
