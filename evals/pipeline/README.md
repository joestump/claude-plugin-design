# Pipeline Eval Scenarios

End-to-end test scenarios that invoke multiple skills in sequence against a disposable test repository.

Governing: [ADR-0021](../../docs/adrs/ADR-0021-skill-evaluation-and-ci-testing.md), SPEC-0017 REQ "Cross-Skill Pipeline Testing".

## What this is for

The standard evals in `evals/evals.json` test each skill in isolation: one prompt, one skill, one set of assertions. That doesn't catch regressions in the *handoff* between skills — a `/sdd:plan` issue body that `/sdd:work` can't parse, a worktree branch that `/sdd:review` can't open a PR against, a spec format that `/sdd:plan` reads differently than `/sdd:spec` writes.

Pipeline scenarios run a sequence (spec → plan → work, with review coverage planned) on a disposable repo and verify that the artifacts each skill produces are consumable by the next.

> **Coverage note:** SPEC-0017 REQ "Cross-Skill Pipeline Testing" Scenario "Full pipeline test" specifies the full chain through `/sdd:review`. The current scaffold covers spec → plan → work only. `/sdd:review` operates against real GitHub/Gitea PRs, which is incompatible with the `local-tmp-init` repo strategy this scaffold uses. Review coverage will land in a follow-up scenario that adopts the `gh-template` strategy (real disposable repo, real PR), tracked separately.

## When these run

Pipeline tests are **not** part of the per-PR eval suite — each scenario takes minutes and consumes meaningful API budget. They run only when:

- A PR targets a `release/*` branch (release-gate)
- Someone manually triggers the workflow via `Actions → Skill Evaluations → Run workflow` and selects pipeline mode
- A maintainer runs the scenario locally for debugging (see "Running locally" below)

## Scenario file format

Each scenario is a JSON file in this directory. Schema:

```json
{
  "id": "core-workflow",
  "description": "Human-readable summary of what this scenario covers",
  "setup": {
    "repo_strategy": "local-tmp-init",
    "seed": {
      "claude_md": "<contents of CLAUDE.md to seed the disposable repo with>",
      "files": []
    }
  },
  "steps": [
    {
      "step": 1,
      "skill": "spec",
      "prompt": "<prompt to send when invoking the skill>",
      "verify": [
        "<assertion>",
        "..."
      ]
    }
  ],
  "final_assertions": [
    "<cross-step assertion verifying artifact handoff>"
  ]
}
```

Field reference:

- `id` — kebab-case identifier, must match the filename stem
- `description` — short human-readable purpose
- `setup.repo_strategy` — `local-tmp-init` (preferred; `git init` in a temp dir) or `gh-template` (creates a real disposable repo via `gh repo create --template`)
- `setup.seed.claude_md` — content for the seed `CLAUDE.md`. Tracker config in this file MUST select `tasks.md` fallback so the scenario doesn't pollute real issue trackers
- `setup.seed.files` — additional seed files (e.g., a starter ADR if the scenario needs one)
- `steps` — ordered skill invocations. Each step's `verify` list is checked before the next step runs
- `final_assertions` — cross-step checks verifying artifacts flowed correctly between skills

## Running locally

```bash
# From the plugin root, with claude-code installed:
mkdir -p /tmp/sdd-pipeline-eval && cd /tmp/sdd-pipeline-eval
git init
# ...seed files per the scenario's setup section...
# ...invoke each skill via `claude -p "/sdd:<skill> <prompt>"`...
# Verify artifacts after each step.
# Clean up: rm -rf /tmp/sdd-pipeline-eval
```

The CI runner (`eval-pipeline` job in `skill-evals.yml`) automates all of the above using `claude-code-action`.

## Adding a new scenario

1. Pick a kebab-case `id` (e.g., `discover-then-spec`)
2. Create `evals/pipeline/{id}.json` matching the schema above
3. Use `tasks.md` fallback in the seeded CLAUDE.md so the scenario doesn't depend on a tracker
4. Verify locally before pushing — pipeline tests are expensive in CI
5. Update this README's scenario list

## Current scenarios

| ID | Description |
|----|-------------|
| [`core-workflow`](core-workflow.json) | Spec → plan → work on a fresh local-tmp repo, verifying artifact flow at each handoff. Review coverage deferred (see "Coverage note" above) |
