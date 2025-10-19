#!/usr/bin/env bash
set -euo pipefail

REMOTE="origin"
MAIN_BRANCH="main"
MODE="rebase" # or "merge"
UPDATE_MAIN_ONLY="false"
AUTO_PUSH="false"

usage() {
  cat <<EOF
Sync your repo with the latest main.

Usage:
  $(basename "$0") [--remote origin] [--main main] [--merge] [--rebase] [--update-main-only] [--push]

Options:
  --remote <name>           Remote name (default: origin)
  --main <branch>           Main branch name (default: main)
  --merge                   Use merge strategy instead of rebase
  --rebase                  Use rebase strategy (default)
  --update-main-only        Only fast-forward local main to remote; don't rebase/merge current branch
  --push                    Push current branch after successful sync
  -h, --help                Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote) REMOTE="$2"; shift 2;;
    --main) MAIN_BRANCH="$2"; shift 2;;
    --merge) MODE="merge"; shift;;
    --rebase) MODE="rebase"; shift;;
    --update-main-only) UPDATE_MAIN_ONLY="true"; shift;;
    --push) AUTO_PUSH="true"; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1"; usage; exit 1;;
  esac
done

echo "[sync] Remote: $REMOTE, Main: $MAIN_BRANCH, Mode: $MODE, Update-main-only: $UPDATE_MAIN_ONLY, Auto-push: $AUTO_PUSH"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
echo "[sync] Current branch: $current_branch"

git fetch --all --prune

if git show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
  :
else
  echo "[sync] Local $MAIN_BRANCH does not exist. Creating to track $REMOTE/$MAIN_BRANCH..."
  git checkout -b "$MAIN_BRANCH" "$REMOTE/$MAIN_BRANCH"
fi

echo "[sync] Updating local $MAIN_BRANCH from $REMOTE/$MAIN_BRANCH..."
git checkout "$MAIN_BRANCH"
git reset --hard "$REMOTE/$MAIN_BRANCH"

if [[ "$UPDATE_MAIN_ONLY" == "true" ]]; then
  echo "[sync] update-main-only set. Done."
  exit 0
fi

if [[ "$current_branch" != "$MAIN_BRANCH" ]]; then
  echo "[sync] Returning to $current_branch..."
  git checkout "$current_branch"

  stash_msg="sync-stash-$(date +%s)"
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "[sync] Stashing local changes..."
    git stash push -u -m "$stash_msg"
    STASHED="true"
  else
    STASHED="false"
  fi

  set +e
  if [[ "$MODE" == "rebase" ]]; then
    echo "[sync] Rebasing $current_branch onto $REMOTE/$MAIN_BRANCH..."
    git rebase "$REMOTE/$MAIN_BRANCH"
    status=$?
  else
    echo "[sync] Merging $REMOTE/$MAIN_BRANCH into $current_branch..."
    git merge --no-ff "$REMOTE/$MAIN_BRANCH" -m "merge: sync with $REMOTE/$MAIN_BRANCH"
    status=$?
  fi
  set -e

  if [[ $status -ne 0 ]]; then
    echo "[sync] Conflict detected. Resolve, then run:"
    if [[ "$MODE" == "rebase" ]]; then
      echo "  git add <files> && git rebase --continue"
    else
      echo "  git add <files> && git commit"
    fi
    if [[ "$STASHED" == "true" ]]; then
      echo "  git stash list | grep $stash_msg && git stash pop"
    fi
    exit $status
  fi

  if [[ "$STASHED" == "true" ]]; then
    echo "[sync] Restoring stashed changes..."
    set +e
    git stash pop
    pop_status=$?
    set -e
    if [[ $pop_status -ne 0 ]]; then
      echo "[sync] Stash pop had conflicts. Resolve them and commit as needed."
      exit $pop_status
    fi
  fi

  if [[ "$AUTO_PUSH" == "true" ]]; then
    echo "[sync] Pushing $current_branch to $REMOTE..."
    git push "$REMOTE" "$current_branch"
  else
    echo "[sync] Skipping push. Use --push to push automatically."
  fi
else
  echo "[sync] You are on $MAIN_BRANCH. Nothing else to do."
fi

echo "[sync] Done."

