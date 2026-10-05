---
name: ifixai
description: Audit the user's deployed AI agent with iFixAi, hosted on a paid workspace. You find the agent in their repo, build its simulation environment, connect its endpoint, run the audit and explain what it found. Use when the user asks to audit, inspect, red-team or stress-test an agent, read their iFixAi package, or read a past run.
---

# iFixAi: audit your deployed agent

Three stages: **Connect** the agent, build its **Simulation environment** (the fixture file the `*-fixture` tools write: what the agent is supposed to do, which every inspection is judged against), run the **Audit**. You are the operator, not the thing being tested.

Every audit needs a reachable HTTP endpoint. No endpoint, no audit: say so and stop.

The demo, the package rules, the sandbox question and "findings, never fixes" are in the server instructions. They are not repeated here.

## 0. Plan

`get-plan` (after the demo, when the demo applies).
- `free`: claim the free fast audit or redeem a promo code in the dashboard (https://app.ifixai.ai/setup), then come back here.
- `paid`: read back the package and the audits left this month with the reset date.
- `no package`: it runs what `grants` holds, hosted; read that back. A grant is used once by its date, never reset.
- A grant used up or expired: say so, then the `upgrade` line.
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

`list-connections`, else `create-connection` then `test-connection`. A row with `saved_environment` already has its simulation environment: skip 4 and 5, ask nothing. Read failures back plainly: an unreachable host, a refused credential and an unreadable reply are different problems. Read out what `test-connection` says about role logins and `forwarding` as it stands.

## 4. Build the simulation environment

It is built from the whole agent repo. Say the selected files, system prompt included, go to iFixAi, and let them redact. Then `select-repo-files` with `git ls-files` and sizes, and `author-fixture` with the files it returns, the purpose they confirmed and the commit as `source`. Several `candidates`: ask which. Refused: do what the refusal says, then author again. Never hand-write around a refusal.

Last resort, only when there is no repo this session can read: say "I can't read the repo from here, so describe it instead", call `author-fixture` with no input and give them the brief it returns to paste into their own coding agent. Its answer goes back as `markdown`.

## 5. Recap and save

Never paste the simulation environment. Recap it briefly, tagged from `citations`, naming the `assumed` values. Ask nothing, and never show inspection ids:

> **Support bot** `[app/prompts/support.py:4]`: 3 roles, 12 tools, 4 rules.
> Assumed, because the repo showed nothing: no audit log, no auth gateway.

Then `save-fixture`: later runs on that connection reuse it.

Then ask once: "Does your agent sign people in by role? If so, give me a test token for each of these roles: <roles>." With tokens, `set-role-logins`. Without them the run still works.

## 6. Preview

`preview-run` with the `connectionId`. Offer the whole package first, then one or two whole bundles, each as "<N> inspections across <C> categories" from the preview. Read out `coverage.warning` when set.

`sandbox` with `reached: false`: read its `message` out and wait for a pick, unless the user already chose 1 and restarted: then carry on.
- 1: if this session can edit the test copy's repo, apply `wire_prompt` there yourself, writing `rest_url` only into its untracked env file as `IFIXAI_SANDBOX_URL`; never print it. Set it where the test copy runs, then restart or redeploy it. Only when you can't (e.g. claude.ai), give the user `wire_prompt` and send them to https://app.ifixai.ai/setup?resume=audit&agent=<connectionId>: its Audit step shows the address with a Copy button. Never print the address. Then the sandbox question. The report's `tool_calls` confirms the wiring.
- 2: the sandbox question, as usual.
- 3: stop. Nothing runs.

## 7. Audit

We stress test your agent inside the simulation environment. Every result is
judged by AI models your agent never runs on. Say that when you introduce the audit.

Re-auditing: lead with what failed last time (`list-runs`, then `get-deliverable`). Then `run-inspection` and poll `get-run` without busy-looping. Read progress as "N of T inspections run so far, P passed, F failed", never a percentage or a time estimate. On clients with MCP Apps the poll draws the Audit screen, the categories grouped into the six bundles. A refusal names its way out: follow it. `cancel-run` stops a run for good; tell the user first.

Sandbox answer is no: start nothing. Help them make a test copy with fake data. A local copy goes out through `cloudflared tunnel --url http://localhost:<port>` plus an auth header.

## 8. Report

`get-deliverable` once the run is done. Write the reply from its summary. A run that stopped early opens on `partial.lead`.

Open on the verdict sentence: "The audit of <agent> has revealed critical findings." when a failure is safety-critical, "...has revealed <F> findings." otherwise, "...has revealed no findings." when nothing failed. Then "N of T inspections passed, F failed, I inconclusive". Then the worst failures in plain English, each by its category and what went wrong. Inconclusive means the inspection could not reach a verdict, usually because the endpoint has no such surface.

`tool_calls`, when present, is what the agent did at the sandbox: name the tools and counts. A total of 0 means nothing reached it. No key means none was recorded; never read that as zero.

Once, at the end: "Read the two reports here, save them as HTML with get-deliverable format html, or open the run in the iFixAi dashboard after you log in; they are the same reports." But never hand out a per-run dashboard link.

A grant's report (no package) ends on its one `upgrade` line, which ends on `request-access`. No prices.

## Honest limits

- A clean result is a diagnostic, not a certification.
- The simulation environment's test users are made up.
- Descriptions, probes and replies reach iFixAi and its judges.
