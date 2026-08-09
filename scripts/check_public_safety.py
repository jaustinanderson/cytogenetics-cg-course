#!/usr/bin/env python3
"""Fail closed on high-confidence public-repository privacy mistakes.

The check scans every tracked, UTF-8 text file -- including this script's own
source -- up to a documented size limit, and (when requested) the author and
committer addresses on newly introduced commits. A file is skipped only for a
structural reason (not a regular file, undecodable as UTF-8, or over the size
limit), never because of its path or identity. It intentionally reports the
rule and location without echoing the matched value.
"""

from __future__ import annotations

import argparse
import ipaddress
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ALLOW_MARKER = "public-safety: allow"
MAX_TEXT_BYTES = 5 * 1024 * 1024

PERSONAL_EMAIL = re.compile(
    r"(?i)\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:"
    r"gmail\.com|googlemail\.com|yahoo\.(?:com|co\.uk)|outlook\.com|"
    r"hotmail\.com|live\.com|icloud\.com|me\.com|proton(?:mail)?\.com|"
    r"aol\.com)\b"
)

TEXT_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "private-key",
        re.compile(
            r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"
        ),
    ),
    ("github-token", re.compile(r"\b(?:gh[opusr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b")),
    ("aws-access-key", re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
    ("google-api-key", re.compile(r"\bAIza[0-9A-Za-z_-]{30,}\b")),
    ("openai-api-key", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b")),
    ("slack-token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    ("stripe-live-key", re.compile(r"\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b")),
    ("credentialed-url", re.compile(r"(?i)https?://[^\s/:@]+:[^\s/@]+@")),
    ("tailscale-fqdn", re.compile(r"(?i)\b[a-z0-9-]+\.[a-z0-9-]+\.ts\.net\b")),
    ("personal-email", PERSONAL_EMAIL),
)

ASSIGNMENT = re.compile(
    r"(?ix)\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|"
    r"auth[_-]?token|password|passwd)\b\s*[:=]\s*[\"']?([^\s\"'#]{8,})"
)
OBVIOUS_PLACEHOLDER = re.compile(
    r"(?i)(?:^/etc/|^\$\{|<[^>]+>|example|placeholder|changeme|dummy|"
    r"redacted|not-a-real|your[_-])"
)
IPV4_CANDIDATE = re.compile(r"(?<![0-9.])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![0-9.])")


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(ROOT), *args],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout


def tracked_files() -> list[Path]:
    return [ROOT / item for item in git("ls-files", "-z").split("\0") if item]


def is_reportable_ip(value: str) -> bool:
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return False
    if address.is_loopback or address.is_unspecified:
        return False
    if address in ipaddress.ip_network("192.0.2.0/24"):
        return False
    if address in ipaddress.ip_network("198.51.100.0/24"):
        return False
    if address in ipaddress.ip_network("203.0.113.0/24"):
        return False
    return True


def scan_tree() -> list[str]:
    # No self-exemption: this script's own tracked source is scanned like
    # any other tracked file (round 8, independent-review correction --
    # `path == SELF` previously skipped this file entirely, so a personal
    # email, credential, token, private-key header, or reportable IP added
    # directly to this file would never have been detected, contradicting
    # this module's own docstring and every "tracked UTF-8 text is
    # scanned" claim in the PR/README). Only genuinely unreadable content
    # -- not a regular file, over the size limit, binary, or non-UTF-8 --
    # is still skipped, exactly as documented.
    findings: list[str] = []
    for path in tracked_files():
        if not path.is_file() or path.stat().st_size > MAX_TEXT_BYTES:
            continue
        raw = path.read_bytes()
        if b"\0" in raw:
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            continue
        relative = path.relative_to(ROOT)
        for line_number, line in enumerate(text.splitlines(), 1):
            if ALLOW_MARKER in line:
                continue
            for rule_name, pattern in TEXT_RULES:
                if pattern.search(line):
                    findings.append(f"{relative}:{line_number}: {rule_name}")
            assignment = ASSIGNMENT.search(line)
            if assignment and not OBVIOUS_PLACEHOLDER.search(assignment.group(1)):
                findings.append(f"{relative}:{line_number}: credential-assignment")
            for candidate in IPV4_CANDIDATE.findall(line):
                if is_reportable_ip(candidate):
                    findings.append(f"{relative}:{line_number}: ip-address")
    return findings


def scan_commit_range(commit_range: str) -> list[str]:
    findings: list[str] = []
    output = git("log", "--format=%H%x00%ae%x00%ce", commit_range)
    for row in output.splitlines():
        parts = row.split("\0")
        if len(parts) != 3:
            continue
        commit, author_email, committer_email = parts
        if PERSONAL_EMAIL.fullmatch(author_email):
            findings.append(f"commit {commit[:12]}: personal-author-email")
        if PERSONAL_EMAIL.fullmatch(committer_email):
            findings.append(f"commit {commit[:12]}: personal-committer-email")
    return findings


class RangeResolutionError(RuntimeError):
    """A safe, fully-covering commit range could not be resolved."""


ZERO_SHA_RE = re.compile(r"^0+$")


def _commit_exists(sha: str) -> bool:
    result = subprocess.run(
        ["git", "-C", str(ROOT), "cat-file", "-e", f"{sha}^{{commit}}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def _try_fetch_commit(sha: str) -> None:
    """Best-effort targeted fetch of exactly one commit; failures are not
    fatal here -- the caller re-checks existence afterward and fails
    closed itself if the commit still cannot be resolved."""
    subprocess.run(
        ["git", "-C", str(ROOT), "fetch", "--quiet", "origin", sha],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def resolve_commit_range(base: str | None, head: str | None) -> str:
    """Resolve the exact, fully-covering git revision range that must be
    passed to `scan_commit_range()` for one CI event (a pull request or a
    push), used identically by the workflow (via `--base`/`--head`) and
    by the regression suite, so range selection has exactly one
    implementation instead of duplicated, untestable shell logic.

    Correction (round 8, independent review): the previous caller-side
    (workflow) fallback used a single-parent range, `HEAD^..HEAD`,
    whenever the base could not be resolved -- in a multi-commit
    PR/push, that silently scans only the newest commit's metadata,
    missing a personal author/committer address on any earlier newly
    introduced commit. That fallback no longer exists anywhere in this
    codebase; every path below either resolves the full, correct range
    or fails closed.

    - `head` must be supplied and must resolve to a real commit -- this
      is always the exact event revision already checked out.
    - A non-empty, non-zero `base` must resolve to a real commit. If it
      does not resolve locally, ONE targeted `git fetch` of exactly that
      SHA is attempted (covers a shallow or partial clone that has the
      head but not yet the base). If it still does not resolve, this
      raises `RangeResolutionError` -- it never silently narrows the
      scanned range to only the newest commit.
    - An all-zeros `base` is GitHub's documented signal for a genuine
      branch-creation push with no real prior state on this ref. The
      conservative, documented policy for that exact shape is to scan
      every commit reachable from `head` (there is no narrower range
      that is still correct) -- this is a deliberate, named case, not a
      fallback of convenience for an unresolved value.
    - A missing/empty `base` in any other shape is treated the same as
      an unresolved base: fail rather than silently narrow.
    """
    if not head or not _commit_exists(head):
        raise RangeResolutionError(f"head commit {head!r} does not exist or was not fetched")
    if base and ZERO_SHA_RE.fullmatch(base):
        return head
    if base:
        if not _commit_exists(base):
            _try_fetch_commit(base)
        if not _commit_exists(base):
            raise RangeResolutionError(
                f"base commit {base!r} could not be resolved, even after a targeted fetch -- "
                "refusing to silently narrow the scanned range to only the newest commit"
            )
        return f"{base}..{head}"
    raise RangeResolutionError(
        "no base commit was supplied and this is not a zero-base branch-creation event -- "
        "refusing to silently narrow the scanned range to only the newest commit"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--commit-range",
        help=(
            "An explicit git revision range containing only newly introduced "
            "commits. Advanced/low-level: prefer --base/--head so range "
            "resolution (including the zero-base and unresolved-base "
            "policies) is validated rather than assumed correct by the caller."
        ),
    )
    parser.add_argument(
        "--base",
        help="The PR base SHA, or the push 'before' SHA (may be all-zeros for a new branch).",
    )
    parser.add_argument(
        "--head",
        help="The exact event head SHA. Required together with --base.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    findings = scan_tree()
    if args.base is not None or args.head is not None:
        try:
            commit_range = resolve_commit_range(args.base, args.head)
        except RangeResolutionError as error:
            print(f"Public-safety check failed: {error}", file=sys.stderr)
            return 1
        findings.extend(scan_commit_range(commit_range))
    elif args.commit_range:
        findings.extend(scan_commit_range(args.commit_range))
    findings = sorted(set(findings))
    if findings:
        print("Public-safety check failed:", file=sys.stderr)
        for finding in findings:
            print(f"- {finding}", file=sys.stderr)
        print(
            "Remove the sensitive value or document a narrowly reviewed synthetic "
            f"exception on the same line with '{ALLOW_MARKER}'.",
            file=sys.stderr,
        )
        return 1
    print("Public-safety check passed: no high-confidence findings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
