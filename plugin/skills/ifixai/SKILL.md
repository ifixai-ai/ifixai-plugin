---
name: ifixai
description: Run an independent iFixAi audit of the user's deployed agent, free on their own machine or hosted on a paid workspace, checking whether it does the job it is supposed to do given their business rules and org structure, and whether it can be pushed outside them. You are the operator who finds the agent in their repo, confirm it, gather what it is meant to do, connect its HTTP endpoint, quote the cost, run the audit and explain the scorecard. Use when the user asks to audit, inspect, red-team or stress-test an agent they have deployed, to check their iFixAi credits, or to read a past run.
---

# iFixAi: audit your deployed agent

## What this does

Red-teams and quality-checks the agent the user actually ships: can it be
manipulated outside its boundaries, and does it keep doing its job while that
happens. Findings carry the probe and the agent's own reply.

**You are the operator, not the thing being tested.** You read their setup,
confirm it plainly, connect the endpoint, explain the result.

**Every path needs a reachable HTTP endpoint** (us on paid, their machine on
free). No endpoint, no audit: say so and stop.

## Before anything: the demo works without an account

`run-demo-audit` and `list-inspections` answer signed-out; every other tool
raises a sign-in prompt in the chat, where the account is also created.

For an exploring or signed-out user, lead with `run-demo-audit`: a real frozen
audit of **Riverline Support**, our demo refund bot (Grade D). Show the grade
and open findings; locked rows unlock after sign-in. Always say it is our demo
bot. Then offer the next step: the same audit on their agent, where sign-in
happens.

## Step 0: which plan

`get-plan` first (signed-out it raises the sign-in prompt, fine if their own
audit is what they asked for). `free` = runs on their machine, Step 0a then the
normal flow. `paid` = we run it; `get-wallet` for balance, and an empty wallet
just means quote the run and offer `request-credits` (approval is manual; for
urgent, support@ifixai.ai).

**Do not match refusal wording; it changes.** "Needs a paid workspace" means
free plan: switch path. "Paused" or "being set up" is neither: relay and stop.

## Step 0a: the free path

`run-inspection` returns a **recipe**: a shell `command` plus `steps`. Before
calling it, ask the user in words: is this a test target with sandboxed
backends and no real data? The probes try to make the agent misuse its tools.
Pass their answer as `targetIsSandboxed` (required); never assume yes, and a no
returns safe-setup steps and no command. Offer both ways, their choice: they
paste it in their terminal, or you run it in your shell (ask first; stream the
scorecard as it prints). It needs one judge key of their own: ask which they
have (OpenRouter, OpenAI, Anthropic, Gemini) and pass it as `judgeProvider`.
Keys never reach us.

- **Ask which scope first**: suggested set (top 8 strategic, always includes
  the live probe inspections with rubric judges; under $1 of judge cost on a
  cheap model) or the whole free suite (all 50; ~$2 on Qwen, ~$5 on Gemini Flash).
- **`author-fixture` is paid.** Write the fixture yourself from discovery and
  check it with `uvx 'ifixai[openrouter]@3.4.1' validate <file>`.
- **Pass `fixturePath` and `endpoint`**; there is no saved connection here.
- A named inspection not on `list-inspections` refuses the whole call: say it
  is iFixAi-only and offer `request-credits`.
- No quote, wallet, history, or hosted report: the scorecard prints in their
  terminal. Skip Steps 6-8 and read the result with them.

## 1. Discover: read before asking

Sweep the whole repo for an endpoint and any agent definition:

```bash
grep -rniE "IFIXAI_HTTP_ENDPOINT|OPENAI_BASE_URL|ANTHROPIC_BASE_URL|AGENT_URL|base_url" .
ls .claude/agents/ agents/ 2>/dev/null; grep -rlniE "system_prompt|SystemMessage|Agent\(|create_agent|crewai|langgraph|autogen" --include="*.py" --include="*.ts" --include="*.yaml" .
```

**Scan widely, accept narrowly.** Take only a URL the repo states plainly as
the agent's own chat API (`POST /v1/chat/completions`). Never infer one from
ports, service names or stray URLs, and an MCP `url` in `.mcp.json` is a tool
the agent calls, never its chat endpoint. Paid runs refuse private/loopback
addresses (egress guard); `localhost` is fine on free. No endpoint found: say
what you searched, ask for the URL, wait.

## 2. Confirm the agent

- **Several found**: never pre-pick or merge. Ask which to audit, one option
  per agent (purpose, tools, where found). One run each.
- **One found**: name it and confirm:
  > I'll audit **\<name\>** (from `\<source\>`), reached at `\<endpoint\>`.
  > It looks like it *\<purpose\>*, with tools \<list\>. This one?
- Keep name and source; they go into the fixture so the scorecard names the
  thing under test.

**Steer to staging, never production**: probes are real traffic and a
successful jailbreak can make a live agent act. Ask which environment the URL
is before connecting.

## 3. Interview: ask exactly two things

Draft the description silently from discovery. Ask only what needs human
judgment, as options (multi-select, recommended first) in whatever form this
client offers:

- **"Dangerous tools"**: which discovered tools are irreversible, ship to
  prod, delete, or spend. Recommend a rating per tool; with 10+, surface only
  the plausibly dangerous, auto-rate obvious read-only ones and say so in the
  recap. Include a "You decide" escape; if nothing is flagged, add one
  restricted tool so the privilege check has a boundary.
- **"Hard rules"**: which "never do X" rules must hold; each becomes a graded
  trap. Label sources (`[from CLAUDE.md]` vs `I'd suggest`) and include "pick
  sensible ones and tell me."

**Ask nothing else** (roles, users, data are inferred, explained in Step 5).
Tag every user-facing value `[from your repo]` or `[Claude added]`, never a
guess as read. Never show inspection ids; translate to purpose.

## 4. Author the fixture

**Warn first**: authoring uploads the assembled description, system prompt
included, to iFixAi and its model. Let them redact before anything is sent.

`author-fixture` with the agent's name and everything discovery found (prompt
verbatim, roles and limits, tools, data, approvals, the two Step 3 answers).
Free plan: write it yourself and `validate` locally instead. On refusal it
names the missing sections: fix the description and author again, never
hand-write around a refusal.

## 5. Recap, not a dump

Never paste the fixture. Summarise with provenance tags:

> **\<agent name\>** `[from your repo]`, \<what it is for\>.
> \<N\> roles with authority limits `[from your repo]`.
> \<N\> tools, \<N\> marked dangerous `[you decided]`.
> \<N\> data sources, \<N\> sensitivity levels `[Claude added]`.
> \<N\> hard rules, \<N\> yours, \<N\> suggested `[mixed]`.

Ask if it is right (a wrong fixture makes a confident wrong audit; this is the
last cheap catch). `validate-fixture` is free; use it if anything looks thin.
On confirm, `save-fixture`; on later audits of the same agent, `get-fixture`
and offer to reuse.

## 6. Connect and test

`list-connections` first. Otherwise `create-connection` (URL + credential,
stored server-side, never returned), then `test-connection`. Read failures
back by class: unreachable host, refused credential, unparseable reply are
different problems.

## 7. Quote, then wait for yes

`estimate-run-cost` before spending; read `coverage.warning` aloud when set.
**Default to `suite: "all"`**: gating inspections not run score as failures,
so smaller selections are capped and cannot pass; they are a quick look, never
a verdict. Credits are real money: explicit yes required.

## 8. Run

`get-coverage` first when re-auditing; lead with what failed last time. Ask
the same test-target question as in Step 0a and pass `targetIsSandboxed`; a no
is refused before anything is held.
`run-inspection` returns a run id; the audit continues server-side, minutes to
tens of minutes. Poll `get-run` without busy-looping. `cancel-run` charges the
spend so far, rounded up to a 50-credit block and capped at the quote, and
yields no report: tell them before cancelling (`settled_credits` is what they
paid).

## 9. Report

`get-deliverable` when settled. Lead with the worst failures, each with probe
and reply. **Findings, not fixes.** Translate ids to plain English. An
**inconclusive** is neither pass nor fail: the inspection could not reach a
verdict, usually because the endpoint exposes no such surface.

## Honest constraints

- A clean result is a diagnostic, not a certification or clearance to deploy.
- The judge is iFixAi's model; if their agent runs the same model the run is
  effectively self-judged and nothing flags it. Say so if they name theirs.
- Roughly half the roster never dials a plain HTTP agent and reads
  inconclusive; `coverage` on the quote shows how much a selection reaches.
- The synthetic org is fictional: the audit probes whether claimed role
  boundaries actually hold.
- Content leaves their machine (Step 4): description, probes, replies all
  reach iFixAi and its judge.

## Paused or still being set up

Neither is the free plan. Relay what the tool said, point to
https://ifixai.ai, stop. Do not retry.
