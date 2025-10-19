#!/usr/bin/env python3
import os
import re
import subprocess
import sys
import json
from datetime import datetime


def run(cmd: list[str], check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=check, capture_output=capture, text=True)


def git(*args: str, capture: bool = False) -> str:
    cp = run(["git", *args], capture=capture)
    return (cp.stdout or "").strip()


def inside_git_repo() -> bool:
    try:
        git("rev-parse", "--is-inside-work-tree")
        return True
    except subprocess.CalledProcessError:
        return False


def origin_url() -> str:
    return git("remote", "get-url", "origin", capture=True)


def parse_repo_path(url: str) -> str | None:
    # git@github.com:owner/repo.git
    m = re.match(r"^git@github.com:(.+?)(?:\.git)?$", url)
    if m:
        return m.group(1)
    # https://github.com/owner/repo(.git)?
    m = re.match(r"^https?://github.com/(.+?)(?:\.git)?$", url)
    if m:
        return m.group(1)
    return None


def detect_default_branch() -> str:
    # Try origin/HEAD
    try:
        ref = git("symbolic-ref", "refs/remotes/origin/HEAD", capture=True)
        return re.sub(r"^refs/remotes/origin/", "", ref)
    except subprocess.CalledProcessError:
        pass
    # Try ls-remote HEAD
    try:
        cp = run(["git", "ls-remote", "--symref", "origin", "HEAD"], capture=True)
        for line in cp.stdout.splitlines():
            if line.startswith("ref:"):
                head = line.split()[1]
                return re.sub(r"^refs/heads/", "", head)
    except subprocess.CalledProcessError:
        pass
    # Fallbacks
    for b in ("main", "master"):
        try:
            git("rev-parse", "--verify", f"origin/{b}")
            return b
        except subprocess.CalledProcessError:
            continue
    for b in ("main", "master"):
        try:
            git("show-ref", "--verify", "--quiet", f"refs/heads/{b}")
            return b
        except subprocess.CalledProcessError:
            continue
    return git("rev-parse", "--abbrev-ref", "HEAD", capture=True)


def has_gh() -> bool:
    try:
        run(["gh", "--version"], check=True)
        run(["gh", "auth", "status"], check=True)
        return True
    except Exception:
        return False


def open_pr_with_gh(repo: str, head: str, base: str, title: str, body: str, labels: list[str], draft: bool) -> str | None:
    args = [
        "gh", "pr", "create",
        "--head", head,
        "--base", base,
        "--title", title,
        "--body", body,
        "--repo", repo,
        "--no-maintainer-edit",
        "--json", "url",
        "-q", ".url",
    ]
    if draft:
        args.append("--draft")
    for l in labels:
        if l:
            args += ["--label", l]
    try:
        cp = run(args, capture=True)
        url = (cp.stdout or "").strip()
        return url or None
    except subprocess.CalledProcessError:
        return None


def open_pr_with_api(repo: str, head: str, base: str, title: str, body: str, labels: list[str], draft: bool) -> str:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN not set for REST API fallback")
    payload = {
        "title": title,
        "body": body,
        "head": head,
        "base": base,
        "draft": draft,
    }
    import urllib.request
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/pulls",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    pr_url = data.get("html_url")
    if not pr_url:
        raise RuntimeError("GitHub API did not return PR URL")
    # Apply labels if any
    if labels:
        number = data.get("number")
        if number:
            labels_req = urllib.request.Request(
                f"https://api.github.com/repos/{repo}/issues/{number}/labels",
                data=json.dumps({"labels": labels}).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            try:
                urllib.request.urlopen(labels_req).read()
            except Exception as e:
                print(f"[create-pr] Warning: Failed to apply labels to PR: {e}", file=sys.stderr)
    return pr_url


def main() -> int:
    print("[create-pr] Starting non-interactive PR creation...")
    if not inside_git_repo():
        print("[create-pr] Error: Not inside a git repository.", file=sys.stderr)
        return 1
    try:
        origin = origin_url()
    except subprocess.CalledProcessError:
        print("[create-pr] Error: No 'origin' remote configured.", file=sys.stderr)
        return 1
    repo = parse_repo_path(origin)
    if not repo:
        print(f"[create-pr] Error: Unable to parse GitHub repository from origin URL: {origin}", file=sys.stderr)
        return 1

    base = os.environ.get("PR_BASE_BRANCH") or detect_default_branch()
    if not base:
        print("[create-pr] Error: Could not determine base branch.", file=sys.stderr)
        return 1
    print(f"[create-pr] Base branch: {base}")

    # Ensure we are up-to-date with base
    try:
        run(["git", "fetch", "origin", base], check=False)
        run(["git", "checkout", "-q", base], check=False)
        run(["git", "pull", "--ff-only", "origin", base], check=False)
    except Exception as e:
        print(f"[create-pr] Warning: Failed to update base branch '{base}'. Continuing anyway. Error: {e}", file=sys.stderr)

    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    try:
        short_sha = git("rev-parse", "--short=8", "HEAD", capture=True)
    except subprocess.CalledProcessError:
        short_sha = "00000000"
    branch = f"auto/pr/{ts}-{short_sha}"
    # Create new branch
    run(["git", "checkout", "-qb", branch])

    # Stage and commit
    run(["git", "add", "-A"])  # always add
    had_changes = True
    try:
        run(["git", "diff", "--cached", "--quiet"], check=True)
        had_changes = False
    except subprocess.CalledProcessError:
        had_changes = True
    if not had_changes:
        print("[create-pr] No staged changes; creating an empty commit.")
        run(["git", "commit", "--allow-empty", "-m", "chore(pr): open PR with no file changes"])
    else:
        commit_message = os.environ.get("COMMIT_MESSAGE", "chore: batch commit for automated PR")
        run(["git", "commit", "-m", commit_message])

    # Push
    run(["git", "push", "-u", "origin", branch], check=True)

    title = os.environ.get("PR_TITLE", f"Automated PR: {branch}")
    body = os.environ.get("PR_BODY", (
        "This pull request was opened automatically.\n\n"
        "- Created by scripts/create_pr.py\n"
        "- Commits all local changes without prompts\n"
        "- Generated branch name includes timestamp and short SHA\n\n"
        "If labels or reviewers are configured by repo automation, they may apply after creation."
    ))
    labels = [l.strip() for l in os.environ.get("PR_LABELS", "").split(",") if l.strip()]
    draft = os.environ.get("PR_DRAFT", "false").lower() == "true"

    pr_url: str | None = None
    if has_gh():
        print("[create-pr] Using GitHub CLI (gh) to open PR...")
        pr_url = open_pr_with_gh(repo, branch, base, title, body, labels, draft)
    if not pr_url:
        print("[create-pr] gh not available or failed; using REST API...")
        try:
            pr_url = open_pr_with_api(repo, branch, base, title, body, labels, draft)
        except Exception as e:
            print(f"[create-pr] Failed to open PR: {e}", file=sys.stderr)
            return 1

    print(f"[create-pr] PR opened: {pr_url}")
    # Print only the URL last for easy capture
    print(pr_url)
    return 0


if __name__ == "__main__":
    sys.exit(main())

