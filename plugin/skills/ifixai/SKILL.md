---
name: ifixai
description: Audit the user's deployed AI agent with iFixAi, free on their own machine or hosted on a paid workspace. You find the agent in their repo, build its simulation environment, connect its endpoint, run the audit and explain what it found. Use when the user asks to audit, inspect, red-team or stress-test an agent, read their iFixAi package, or read a past run.
---

# iFixAi: audit your deployed agent

Three stages: **Connect** the agent, build its **Simulation environment** (the fixture file, and the `*-fixture` tools that write it), run the **Audit**. You are the operator, not the thing being tested.

Every audit needs a reachable HTTP endpoint. No endpoint, no audit: say so and stop.

The demo, the package rules, the sandbox question and "findings, never fixes" are in the server instructions. They are not repeated here.

## 0. Plan

`get-plan` (after the demo, when the demo applies).
- `free`: offer two paths, open source first.
  1. Open source, free: on the user's machine with their own LLM key, on the latest ifixai. Follow **Free plan** at the end.
  2. Hosted by iFixAi, the full report: claim the free fast audit or redeem a promo code in the dashboard (https://ifixai-dashboard.vercel.app/setup), then come back here.
- `paid`: read back the package and the audits left this month with the reset date. No package but a grant with audits left: it runs hosted, read back what `grants` says.
- A grant used up or expired: say so, then offer the open-source path (**Free plan**) and the `upgrade` line.
- "Paused" or "being set up": relay what the tool said, point to https://ifixai.ai, stop.

## 1. Find the agent

```bash
grep -rniE "IFIXAI_HTTP_ENDPOINT|OPENAI_BASE_URL|ANTHROPIC_BASE_URL|AGENT_URL|base_url" .
ls .claude/agents/ agents/ 2>/dev/null; grep -rlniE "system_prompt|SystemMessage|Agent\(|create_agent|crewai|langgraph|autogen" --include="*.py" --include="*.ts" --include="*.yaml" .
```

Accept only a URL the repo states as the agent's own chat API (`POST /v1/chat/completions`). An MCP `url` is a tool the agent calls, not its endpoint. Nothing found: say what you searched and ask for the URL.

## 2. Confirm it

Several agents: ask which one, one run each. One agent: confirm in a line, "I'll audit **<name>** at `<endpoint>`. It looks like it <purpose>. This one?" Ask whether the URL is staging or production, and steer to staging: probes are real traffic.

## 3. Connect

`list-connections`, else `create-connection` then `test-connection`. Read failures back plainly: an unreachable host, a refused credential and an unreadable reply are different problems. Read out what `test-connection` says about role logins and `forwarding` as it stands.

Offer the sandbox only when `test-connection` reports no way to see tool calls (`none`): point the test copy's tools at its `rest_url`, then read `last_call_at` on `list-connections` before running. Null means the agent never reached it.

## 4. Ask two things

As options, your recommendation first:
- **Dangerous tools**: which tools are irreversible, delete data, or spend money.
- **Hard rules**: which "never do X" rules must hold.

Infer the rest. Never show inspection ids to the user.

## 5. Build the simulation environment

It is what the agent is supposed to do: workflows, roles, rules, permissions, tools. Every inspection is judged against it.

It is built from the whole agent repo. Ask for the repo first, every time. Warn that the selected files, system prompt included, go to iFixAi, and let them redact.

1. `select-repo-files` with `git ls-files` and sizes.
2. Read what it returns, then `author-fixture` with those `files`, a one-line `purpose` and the commit as `source`.
3. Several `candidates`: ask which. Refused: add the files it names and author again. Never hand-write around a refusal.

Last resort, only when there is no repo this session can read: say "I can't read the repo from here, so describe it instead". Give them this prompt to paste into their own coding agent, then pass its answer as `markdown`:

```
Describe the AI agent in this repo so iFixAi can build a test environment for it. Read the code, don't guess: system prompt, tool definitions, permission checks, auth, routes, README. Use the repo's own words.

- End each line with its source, like [app/prompt.py:12].
- Repo silent? Write "not stated". Never invent.
- No secrets: keys, tokens, passwords, real customer data.
- Several agents? Ask me which one.
- Reply with one markdown code block: exactly these headings, in this order, nothing else.

# <agent name>
## What it is for
What it does, for whom, at which company. One or two sentences.
## Who uses it
One bullet per role, the approving role first: "<role>: who they are. May ... May not ..."
## Tools
One bullet per tool in the code or the system prompt: "<exact tool id>: what it does; whether it reads, changes, deletes, sends outside or moves money; whether it can be undone; which roles may call it."
## Data it reads
One bullet per store: what it holds, its sensitivity if stated, which roles may read it.
## Rules it must follow
Numbered, word for word.
## When it hands over to a human
One bullet per condition, then the queue or channel names and any ticket id pattern (like TKT-<number>).
## Obligations
Laws and standards it names.
## Controls the repo shows
One line each: authentication, authorization check before a tool runs, audit log, step logging (each tool call logged), runtime config (a limit or rule changed without a deploy), policy versioning (prompt version recorded per decision), human override or stop, PII redaction, data retention (with its period), opt-out or data deletion.
```

## 6. Recap and save

Never paste the simulation environment. Recap it in a few tagged lines (`citations` gives each value's `path:line`) and ask the `assumed` values as questions:

> **Support bot** `[from app/prompts/support.py:4]`: 3 roles, 12 tools (2 dangerous, you decided), 4 hard rules.
> Assumed, because the repo showed nothing: no audit log, no auth gateway. Right?

A wrong environment gives a confident wrong audit, so wait for a yes. Then `save-fixture`: later runs on that connection reuse it.

Then ask once: "Does your agent sign people in by role? If so, give me a test token for each of these roles: <roles>." With tokens, `set-role-logins`. Without them the run still works.

## 7. Preview

`preview-run`. Offer the whole package first, then one or two whole bundles, each as "<N> inspections across <C> categories" from the preview. Read out `coverage.warning` when set. Recommend the whole package: a gating inspection left out counts as a failure.

## 8. Audit

We stress test your agent inside the simulation environment. Every result is
judged by AI models your agent never runs on. Say that when you introduce the audit.

Re-auditing: lead with what failed last time (`list-runs`, then `get-deliverable`). Then `run-inspection` and poll `get-run` without busy-looping. Read progress as "N of T inspections run so far, P passed, F failed", never a percentage or a time estimate. On clients with MCP Apps the poll draws the Audit screen, the categories grouped into the six bundles. A refusal names its way out: follow it. `cancel-run` stops a run for good; tell the user first.

Sandbox answer is no: start nothing. Help them make a test copy whose tools point at the `rest_url` from `create-connection`, or at a staging copy with fake data. A local copy goes out through `cloudflared tunnel --url http://localhost:<port>` plus an auth header.

## 9. Report

`get-deliverable` once the run is done. Write the reply from its summary.

Open on the verdict sentence: "The audit of <agent> has revealed critical findings." when a failure is safety-critical, "...has revealed <F> findings." otherwise, "...has revealed no findings." when nothing failed. Then "N of T inspections passed, F failed, I inconclusive". Then the worst failures in plain English, each by its category and what went wrong. Inconclusive means the inspection could not reach a verdict, usually because the endpoint has no such surface.

`tool_calls`, when present, is what the agent did at the sandbox: name the tools and counts. A total of 0 means nothing reached it. No key means none was recorded; never read that as zero.

Once, at the end: "Read the two reports here, save them as HTML with get-deliverable format html, or open the run in the iFixAi dashboard after you log in; they are the same reports." But never hand out a per-run dashboard link.

A grant's report (no package) ends on its one `upgrade` line, which ends on `request-access`. No prices.

## Free plan

`run-inspection` returns a command and steps. Pass `endpoint`, `fixturePath` and `judgeProvider` (ask which key they have: OpenRouter, OpenAI, Anthropic or Gemini). Keys never reach iFixAi.
- Scope: the open-source inspections by default (a few dollars on your own key), or the ids the user names, as `tests`.
- One judge by default. Two needs a second provider key (`secondJudgeProvider`).
- `author-fixture` is paid, so write the simulation environment yourself from the step 5 headings and run `uvx 'ifixai@4.0.0' validate <file>` until it passes.
- An id the free plan refuses is paid only: say so.
- Sandbox answer is no: tell them to run a test copy whose tools cannot reach real data or money, then come back. No command.
- Results land in `./ifixai-results/`. Read them out as findings.

## Honest limits

- A clean result is a diagnostic, not a certification.
- Free plan: an agent on the same model as its judge is effectively self-judged. Say so if they name it.
- The simulation environment's org is synthetic.
- Descriptions, probes and replies reach iFixAi and its judges.
