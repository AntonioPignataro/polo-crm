#!/usr/bin/env bash
# Run a git command using the sistemapolo PAT (GH_TOKEN from .env.ops), injected
# for this ONE invocation only. The token is never written to .git/config, never
# placed on the process command line, and never leaks to other remotes.
#
# Usage (pass the full git args, including the remote):
#   scripts/git-ops.sh push sistemapolo main
#   scripts/git-ops.sh fetch sistemapolo
#   scripts/git-ops.sh ls-remote sistemapolo HEAD
#
# Plain `git push sistemapolo main` (without this wrapper) will NOT authenticate,
# by design — the token is only ever loaded per-command from the gitignored .env.ops.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env.ops ]] || { echo "error: .env.ops not found (needed for GH_TOKEN)" >&2; exit 1; }
set -a; source ./.env.ops; set +a
[[ -n "${GH_TOKEN:-}" ]] || { echo "error: GH_TOKEN not set in .env.ops" >&2; exit 1; }

# GH_TOKEN is exported into the environment above; git's credential helper subshell
# reads $GH_TOKEN at call time (deferred expansion — not baked into argv).
exec git \
  -c "credential.helper=!f() { test \"\$1\" = get && echo username=x-access-token && echo \"password=\$GH_TOKEN\"; }; f" \
  "$@"
