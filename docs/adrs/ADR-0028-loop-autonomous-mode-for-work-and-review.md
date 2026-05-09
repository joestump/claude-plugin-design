---
status: proposed
date: 2026-05-09
decision-makers: joestump
extends: [ADR-0010, ADR-0017]
related: [ADR-0026, ADR-0021]
---

# ADR-0028: /loop Autonomous Mode for /sdd:work and /sdd:review

## Context and Problem Statement

Users want to grind down a backlog without babysitting each invocation: leave the session running, come back, and find the queue smaller — issues implemented, PRs reviewed, stories merged. The Claude Code runtime already ships a `/loop` skill ("Run a prompt or slash command on a recurring interval ... Omit the interval to let the model self-pace"). In principle, `/loop /sdd:work` and `/loop /sdd:review` deliver this behavior for free.

In practice, naive `/loop` wrapping of these two skills is hazardous. Both skills are heavyweight multi-agent orchestrators: `/sdd:work` spawns up to N worker agents in git worktrees that may still be running when the next loop tick fires; `/sdd:review` interacts with PRs whose CI is mid-flight, whose feedback is being addressed by responders, and whose merge is irreversible. The hazards split into four buckets:

1. **Concurrency races.** A second `/sdd:work` iteration can claim the same backlog issue the first iteration is already implementing in a worktree. A second `/sdd:review` iteration can re-review a PR while the responder from the previous iteration is still pushing fixes.
2. **Unbounded spend.** Without an explicit budget, the loop keeps grinding. Backlogs grow (new issues land), PRs receive new comments (loop re-reviews), and the agent pair count multiplies across iterations.
3. **Lost user-in-the-loop.** ADR-0010 picked a bounded one-round review-response cycle precisely to avoid runaway loops. Wrapping `/sdd:review` in `/loop` reintroduces the unbounded behavior unless the loop layer enforces stop conditions.
4. **No escape hatch for ambiguity.** When a story has unclear acceptance criteria, or a PR receives genuinely conflicting feedback, the conservative answer is "stop and ask a human." A loop-naive skill cannot tell the difference between "ambiguous, ask user" and "blocked, retry next iteration."

The problem: define how `/sdd:work` and `/sdd:review` cooperate with `/loop` so that autonomous backlog-grinding is safe, observable, interruptible, and conservative by default — without redesigning `/loop` itself.

## Decision Drivers

* **Conservative defaults.** The user's stated preference is "skew conservative." Novel actions, ambiguous criteria, budget escalation, and post-feedback merges all MUST pause for `AskUserQuestion` rather than guess.
* **Cost and budget visibility.** The user must always know how much has been spent, and the loop must stop before exceeding a declared ceiling — measured in iterations, PRs touched, and wall-clock minutes.
* **Concurrency safety.** A loop tick that fires while previous worktrees or responder agents from the same skill are still active MUST NOT race them. The behavior here must be explicit, not emergent.
* **Observability between iterations.** Each loop tick should produce a one-screen status report — backlog size, PRs touched, budget remaining, stop conditions evaluated — so the user can sample and intervene.
* **Interrupt and resume.** The user must be able to halt a running loop without leaving the system in an inconsistent state (orphan worktrees, half-merged PRs, dangling labels).
* **No redesign of `/loop`.** This ADR adds a contract on top of the existing `/loop` skill; it does not modify `/loop`'s scheduling or self-pacing logic.
* **Bounded review iteration is preserved.** ADR-0010's one-round review-response cycle is a per-PR invariant. Loop iteration MUST NOT amount to "infinite review rounds on the same PR."

## Considered Options

* **Option 1**: Status quo — users wrap manually with `/loop /sdd:work` (or `/loop /sdd:review`); skills are loop-naive; safety is the user's problem.
* **Option 2**: Skill-side `--loop` flag with hard-coded conservative defaults — `/sdd:work --loop` and `/sdd:review --loop` opt into autonomous mode, where the skill itself enforces stop conditions, concurrency locks, user-prompt gates, budget ceilings, and inter-iteration telemetry. `/loop` is still the runtime that re-invokes; the flag is the contract.
* **Option 3**: Background daemon mode — the skill schedules itself in the background and runs without user prompts at all.
* **Option 4**: Pure `/loop` wrapping with no skill-side changes — the runtime handles iteration, skills stay loop-naive, the user-prompt cadence is left to whatever `/loop` decides.

## Decision Outcome

Chosen option: **"Option 2 — skill-side `--loop` flag with hard-coded conservative defaults"**, because it is the only option that preserves ADR-0010's bounded-iteration invariant, preserves the user-in-the-loop preference, and gives the skill enough information to enforce concurrency safety without touching `/loop` itself. Option 1 punts safety to the user. Option 3 is the opposite of "skew conservative." Option 4 cannot enforce per-skill invariants the runtime does not know about.

`/loop` remains the re-invocation engine. The `--loop` flag turns on the skill-side contract: stop conditions, concurrency model, user-prompt gates, budget controls, telemetry. Users invoke as `/loop /sdd:work --loop` or `/loop /sdd:review --loop --pr 142`. The interval is `/loop`'s concern; everything that happens inside an iteration is the skill's concern.

### Sub-decisions

#### Stop conditions (enumerated)

A loop iteration evaluates stop conditions on entry and on exit. Any one matching condition halts the loop and emits a final report.

| # | Condition | Applies to | Behavior |
|---|-----------|-----------|----------|
| 1 | Backlog empty after filtering (no unblocked, unworked issues) | work | Stop, report empty queue |
| 2 | PR merged, closed, or marked do-not-merge | review | Stop, report terminal state |
| 3 | Iteration budget reached (default: **5 iterations**) | both | Stop, report budget |
| 4 | PR-touch budget reached (default: **20 PRs across the loop run**) | both | Stop, report budget |
| 5 | Wall-clock budget reached (default: **60 minutes**) | both | Stop, report budget |
| 6 | Same issue/PR fails twice with the same root cause | both | Stop, escalate via `AskUserQuestion` |
| 7 | Dependency cycle detected in backlog | work | Stop, surface cycle, request manual resolution |
| 8 | User interrupt (Ctrl-C, session close, explicit `/loop stop`) | both | Stop after current iteration drains, no half-states |
| 9 | A previous iteration's worktree or agent is still active AND `--lock=skip` is not set | both | See concurrency model below |
| 10 | `AskUserQuestion` returned "stop the loop" at any prior gate | both | Stop |

Defaults are conservative by design. Users widen budgets explicitly: `--max-iterations 20`, `--max-prs 50`, `--max-minutes 240`. Budgets are inclusive across the entire `/loop` run, not per-iteration — a 20-PR ceiling means 20 across all iterations combined.

#### Concurrency model

The default concurrency model is **lock-and-skip**:

* On entry, the skill writes a lockfile at `.sdd/loop/{skill}.lock` with PID, iteration number, and timestamp.
* If a lockfile already exists and the recorded PID is alive (or its worktrees/agents are still running), the new iteration **skips** silently and lets `/loop` reschedule. A one-line note lands in the iteration report: "Previous iteration N still active — skipping this tick."
* If the lockfile is stale (PID dead, no worktrees, no team members), the new iteration claims the lock.
* On graceful exit, the lockfile is removed. On crash, the lockfile is reaped on the next iteration's stale check.
* `--lock=skip` (default): skip the iteration on contention.
* `--lock=wait`: block this iteration until the previous one finishes (use only with `--max-minutes` to bound wait time).
* `--lock=force` (DISCOURAGED): override the lock. Triggers `AskUserQuestion` confirmation each time — the user must reaffirm.

Concurrency invariants:

* `/sdd:work --loop` MUST NOT pick up an issue that is already labeled `in-progress` by a sibling iteration's worktree.
* `/sdd:review --loop` MUST NOT submit a new review on a PR whose previous-iteration responder has not yet pushed fixes (verify by checking the latest PR head SHA against the SHA the previous iteration recorded).
* CI mid-flight is not a lock contention condition — it is a per-PR readiness condition handled by the existing `/sdd:review` CI gate (skip until green).

#### User-prompt gates (`AskUserQuestion`)

The default is to ask the user before doing anything novel. A novel action is one whose blast radius extends beyond the current iteration's scoped change. The following gates MUST trigger `AskUserQuestion` even in loop mode:

| Gate | Trigger | Question |
|------|---------|----------|
| Backlog drift | Backlog has shifted (new high-priority issues, removed issues) since the last iteration started | "Backlog changed since last iteration. Re-propose the next batch?" |
| Ambiguous acceptance criteria | Issue lacks a `### Acceptance Criteria` section, or has TBD/TODO markers | "Issue #N has ambiguous criteria. Skip, escalate, or proceed with my best interpretation?" |
| Budget escalation | An iteration would push past 80% of any budget | "Approaching {budget} ceiling ({used}/{total}). Continue, raise ceiling, or stop?" |
| Post-feedback merge | `/sdd:review` would merge a PR after responder addressed human review comments | "Responder addressed human feedback on PR #N. Merge now or hold for human re-review?" |
| Force-unlock | `--lock=force` requested | "Force-unlock previous iteration's lock? This may corrupt in-flight work." |
| Repeated failure | Same issue/PR has failed in two consecutive iterations | "Issue/PR #N failed twice with: {root-cause}. Skip, retry once more, or stop the loop?" |

These prompts are NOT debounced across iterations — each gate is re-evaluated on every tick. The loop trades a few prompts per session for the safety guarantee that the skill never silently changes behavior.

#### Budget controls

Budgets are declared at loop entry and persisted in `.sdd/loop/{skill}.budget.json`. The file holds:

```json
{
  "started_at": "2026-05-09T14:32:00Z",
  "max_iterations": 5,
  "max_prs": 20,
  "max_minutes": 60,
  "iterations_used": 2,
  "prs_touched": ["#141", "#142", "#143", "#145"],
  "minutes_elapsed": 18
}
```

On every tick, the skill reads the file, increments the relevant counters, evaluates stop conditions 3–5, writes the file back. The PR set is deduped — a PR re-reviewed across two iterations counts once toward `max_prs`.

CLI overrides (all optional):

* `--max-iterations N` (default 5)
* `--max-prs N` (default 20)
* `--max-minutes N` (default 60)
* `--budget-file PATH` (default `.sdd/loop/{skill}.budget.json`)

Budgets reset only when the user explicitly invokes a fresh loop run (no resume) or deletes the budget file.

#### Telemetry and observability

Each iteration emits a status block to stdout (visible in the session) and appends a JSON line to `.sdd/loop/{skill}.history.jsonl`:

```
## Loop Iteration 3/5 — /sdd:work --loop

Started: 2026-05-09T14:50:00Z
Backlog: 12 unblocked, 4 blocked, 0 in-progress
Iteration plan: implement #143, #145, #149 (3 of 4 max-agents)

Budget remaining: 2 iterations, 16 PRs, 42 minutes

Stop conditions evaluated: none triggered
Concurrency: lock acquired (previous iteration drained at 14:48)

Outcome: 3 PRs opened (#151, #152, #153). 1 issue (#149) escalated for ambiguous criteria.

Next tick: scheduled by /loop
```

The history JSONL is the source of truth for `--resume`. A new `/loop /sdd:work --loop --resume` reads the most recent history line and continues from the recorded budget state.

### Consequences

* Good, because the user gets autonomous backlog-grinding without losing the user-in-the-loop preference.
* Good, because budgets are explicit and inclusive across iterations — no silent runaway spend.
* Good, because lock-and-skip is the safest concurrency model: the worst case is a wasted tick, never a corrupted worktree.
* Good, because ADR-0010's bounded-iteration invariant per PR is preserved — `/loop` re-invokes the skill, but each invocation still does at most one review-response round per PR.
* Good, because the user-prompt gates list is enumerated, not vibes-based — adding a new gate is an ADR change, not a quiet edit.
* Good, because telemetry between iterations gives the user a sampling point to intervene without halting the loop manually.
* Bad, because six user-prompt gates can feel chatty on a long autonomous run. Mitigated by the explicit goal: chatty is the conservative default; users who want quieter autonomy can lower budgets so the loop ends sooner instead of relaxing gates.
* Bad, because budget-file-on-disk adds a small failure surface (file corruption, race with another shell). Mitigated by atomic writes (write-temp + rename) and the lockfile.
* Bad, because the lockfile-and-stale-PID dance is OS-dependent — on Windows, PID liveness checks differ. Mitigated by treating ambiguous lock state as "active" by default (skip the iteration) and surfacing a one-line warning.
* Neutral, because `--lock=force` exists as an escape hatch but requires an `AskUserQuestion` confirmation every use.

### Confirmation

Compliance is confirmed by:

1. `skills/work/SKILL.md` documents the `--loop` flag with all six default budgets and gates, governed by this ADR.
2. `skills/review/SKILL.md` documents the `--loop` flag with the post-feedback-merge gate explicitly cross-referenced to ADR-0010's bounded-iteration rule.
3. Both skills implement the `.sdd/loop/{skill}.lock`, `.budget.json`, and `.history.jsonl` files at the documented paths.
4. An integration test runs `/loop /sdd:work --loop --max-iterations 2 --max-prs 0 --dry-run` and asserts (a) two iterations execute, (b) zero PRs are touched, (c) the budget file reflects both iterations.
5. An integration test runs `/loop /sdd:review --loop --pr {N}` while a previous iteration's lockfile is fresh and asserts the new iteration skips with the expected one-line note.
6. A sandbox test triggers each of the six user-prompt gates and asserts `AskUserQuestion` is called with the documented question text.
7. A spec follows this ADR (named e.g. SPEC-00XX "Loop Autonomous Mode for Work and Review") translating these sub-decisions into RFC-2119 requirements.

## Pros and Cons of the Options

### Option 1: Status quo — manual `/loop` wrapping

The user invokes `/loop /sdd:work` directly; the skill is loop-naive; safety, budget, and concurrency are the user's responsibility.

* Good, because zero plugin work — `/loop` already exists and works for simple commands.
* Good, because no new flags or files to document.
* Bad, because two heavyweight multi-agent skills running in a tight `/loop` will race their own previous iterations. Lockfiles and stop conditions are not concerns the runtime can solve.
* Bad, because budgets are nonexistent — a user can leave `/loop /sdd:work` running overnight and wake up to a five-figure bill.
* Bad, because the user-in-the-loop preference is silently violated; the skill makes novel decisions every iteration without prompting.
* Bad, because ADR-0010's bounded-iteration invariant is violated (loop = unbounded review-response cycles).

### Option 2: Skill-side `--loop` flag (chosen)

The skill itself enforces all loop-mode contracts; `/loop` is the re-invocation engine.

* Good, because every safety property (stop conditions, concurrency, gates, budgets, telemetry) is enforceable by the skill that knows its own invariants.
* Good, because preserves ADR-0010's per-PR bounded iteration.
* Good, because additive — does not modify `/loop` itself.
* Good, because the contract surface is documented in one place per skill.
* Bad, because adds three on-disk artifacts per skill (lock, budget, history) and the failure modes that come with them.
* Bad, because chatty by default — six gates can prompt several times per long run.

### Option 3: Background daemon mode

The skill schedules itself in the background, runs without user interaction.

* Good, because maximally autonomous — true "set and forget."
* Bad, because the opposite of "skew conservative" — every novel decision happens silently.
* Bad, because the daemon itself is a new install/management surface (similar to ADR-0026's rejection of the file-watching daemon for similar reasons).
* Bad, because no clean way to interrupt or resume short of killing the process, which leaves orphan worktrees and dangling labels.
* Bad, because invisible to the user during the run — telemetry would have to push notifications, which is a separate plumbing problem.

### Option 4: Pure `/loop` wrapping with no skill changes

Skills stay loop-naive. The runtime handles iteration. Whatever safety the runtime offers is what users get.

* Good, because no skill-side complexity.
* Good, because the runtime might (someday) add generic budget/lock primitives.
* Bad, because skill invariants (per-PR bounded iteration, worktree exclusivity, label-state machines) are not invariants the runtime can know about.
* Bad, because user-prompt gates require domain knowledge — what is "ambiguous criteria" in a generic `/loop`? — so the runtime cannot enforce them.
* Bad, because effectively equivalent to Option 1 at the user-experience layer.

## Architecture Diagram

```mermaid
flowchart TD
  Start([User: /loop /sdd:work --loop]) --> RuntimeLoop[/loop runtime: schedule next tick/]
  RuntimeLoop --> Tick{New tick fires}
  Tick --> LockCheck{Lockfile fresh?}
  LockCheck -->|yes, --lock=skip| SkipNote[One-line skip note] --> RuntimeLoop
  LockCheck -->|no| AcquireLock[Acquire .sdd/loop/work.lock]

  AcquireLock --> ReadBudget[Read budget.json]
  ReadBudget --> StopEval{Stop conditions<br/>1-7, 10 met?}
  StopEval -->|yes| FinalReport[Emit final report] --> ReleaseLock[Release lock] --> Done([Loop ends])
  StopEval -->|no| Drift{Backlog drifted?}
  Drift -->|yes| AskDrift[AskUserQuestion: re-propose?] --> Drift2{User: stop?}
  Drift2 -->|stop| FinalReport
  Drift2 -->|continue| RunBody
  Drift -->|no| RunBody

  RunBody[Run skill body:<br/>discover, dispatch workers,<br/>open PRs] --> AmbCheck{Ambiguous<br/>criteria?}
  AmbCheck -->|yes| AskAmb[AskUserQuestion:<br/>skip/escalate/proceed] --> RunBody
  AmbCheck -->|no| BudgetCheck{Budget &gt; 80%?}
  BudgetCheck -->|yes| AskBudget[AskUserQuestion:<br/>continue/raise/stop] --> RunBody
  BudgetCheck -->|no| Telemetry[Append history.jsonl<br/>+ emit status block]

  Telemetry --> UpdateBudget[Increment budget.json] --> ReleaseLock2[Release lock] --> RuntimeLoop

  classDef gate fill:#fce8b2,stroke:#b58900
  classDef stop fill:#fbb,stroke:#900
  classDef cheap fill:#bfb,stroke:#090
  class AskDrift,AskAmb,AskBudget gate
  class FinalReport,Done stop
  class AcquireLock,ReleaseLock,ReleaseLock2,Telemetry,UpdateBudget cheap
```

## More Information

* This ADR extends ADR-0010 by preserving its bounded-iteration invariant under loop wrapping. ADR-0010 caps review-response rounds at one per PR per `/sdd:review` invocation; this ADR caps how many invocations can happen across a `/loop` run via the iteration and PR budgets.
* This ADR extends ADR-0017 by clarifying that the parallelism cap (max-parallel-agents) is per-iteration, not per-loop-run. A single iteration of `/sdd:work --loop` MAY spawn up to `max-parallel-agents` workers; the next iteration MAY spawn another batch only after the previous workers terminate (enforced by the lockfile).
* `/loop` itself is unchanged. The contract is on the skill side. Other skills (e.g., `/sdd:audit`, `/sdd:check`) are not in scope for this ADR — autonomous looping for read-only skills is a different conversation.
* The implementation will land in a separate spec (RFC-2119 requirements for each sub-decision) and PRs that modify `skills/work/SKILL.md` and `skills/review/SKILL.md`. This ADR is documentation-only.
* The user-prompt gate list is intentionally not exhaustive — future ADRs may add gates for novel decisions discovered in production. The principle ("ask before doing anything novel") is the durable contract; the specific gate list is the v1 enumeration.
* Out of scope for this ADR: scheduled-agent integration via the `schedule` skill (cron-style remote runs), web-dashboard observability, multi-machine loop coordination. Each of those is a separate decision once V1 produces telemetry to inform it.
