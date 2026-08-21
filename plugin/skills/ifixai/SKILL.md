---
name: ifixai
description: Run an independent iFixAi audit of the user's deployed agent, free on their own machine or hosted on a paid workspace, checking whether it does the job it is supposed to do given their business rules and org structure, and whether it can be pushed outside them. You are the operator who finds the agent in their repo, confirm it, gather what it is meant to do, connect its HTTP endpoint, quote the cost, run the audit and explain the scorecard. Use when the user asks to audit, inspect, red-team or stress-test an agent they have deployed, to check their iFixAi credits, or to read a past run.
---

# iFixAi: audit your deployed agent

## What this does

Two questions at once, against the agent the user actually ships:

- **Red teaming**: can it be manipulated, exploited, or pushed outside its boundaries?
- **Operational assurance**: does it still do its actual job, respect authority and follow approval chains while that is happening?

Failures come back across five modes: fabrication, manipulation, deception,
unpredictability, opacity. Each finding carries the prompt that caused it and the
agent's own reply.

**You are the operator, not the thing being tested.** You read the user's setup,
confirm it in plain language, connect their endpoint, and explain the result. The
user never memorises a flag.

**Either path needs a reachable HTTP endpoint.** Something dials the agent: us on
a paid workspace, their own machine on the free plan. There is no bare-model
fallback, so if no endpoint exists, say so and stop rather than testing something
that is not their agent.

## Step 0: find out which plan they are on

Call `get-plan` first. It answers for everyone and tells you which of the two
paths below you are on: `free` (runs on their machine) or `paid` (we run it).

**Free.** Nothing is billed and nothing is saved with us. The audit runs in their
own shell, on their own LLM key, against the open-source inspections. Go to
**Step 0a**, then join the normal flow at Step 1: discovery, the agent, and the
fixture all work the same.

**Paid.** Call `get-wallet` for the balance. An empty wallet is not the same as
no access: say what the run they want would cost and offer `request-credits` for
that amount. `list-credit-requests` shows anything pending. Approval is manual
with no alert behind it, so say to email support@ifixai.ai if it is urgent.

**If a tool refuses, do not match on wording, the strings change.** A refusal
naming a paid workspace means they are on the free plan and that tool is not part
of it, so switch to the free path rather than stopping. "Paused" or "still being
set up" is neither plan: relay it and stop.

## Step 0a: the free path

On the free plan, `run-inspection` does not start a run. It returns a **recipe**:
a `command` to run in their shell plus `steps` for anyone without one. Hand them
the command, or run it for them if they ask. It needs their own
`OPENROUTER_API_KEY` for the judge, and it dials their agent from their machine,
so their keys never reach us.

What differs from the paid flow below:

- **`author-fixture` is paid**, because it spends our tokens. Write the fixture
  yourself from what discovery found, save it to a file, and check it with
  `uvx 'ifixai[openrouter]@3.3.0' validate <file>`. Free and offline.
- **Pass `fixturePath`, not the fixture itself.** The command reads it off their
  disk. Pass `endpoint` too: there is no saved connection on this plan.
- **`list-inspections` shows what this plan can run.** If they name an inspection
  that is not on it, the call is refused whole and nothing runs. Say it is one of
  the iFixAi-only inspections, and offer `request-credits`.
- **No quote, no wallet, no saved history, no hosted report.** The scorecard
  prints in their terminal. Skip Steps 6 to 8 and read the result with them.

## 1. Discover: read before asking

**Scan the whole repo for two things: an endpoint you can reach the agent through,
and any agent definition.** Sweep the tree, do not check a fixed list of filenames.

```bash
# an endpoint the repo states plainly
grep -rniE "IFIXAI_HTTP_ENDPOINT|OPENAI_BASE_URL|ANTHROPIC_BASE_URL|AGENT_URL|base_url" .
# an agent definition, in any framework
ls .claude/agents/ agents/ 2>/dev/null; grep -rlniE "system_prompt|SystemMessage|Agent\(|create_agent|crewai|langgraph|autogen" --include="*.py" --include="*.ts" --include="*.yaml" .
```

**Scan widely, accept narrowly.** Only take a URL the repo states plainly as the
agent's own chat API (`POST /v1/chat/completions`): an `IFIXAI_HTTP_ENDPOINT`, an
OpenAI-style base URL in `.env` or config, or one the README documents as the
agent's API. **Do not infer an endpoint** from container ports, service names or
stray URLs; you will probe the wrong service. An MCP server `url` in `.mcp.json`
is a *tool the agent calls*, not its chat endpoint: it feeds the tool list, never
the connection.

The endpoint must be publicly reachable. Anything resolving to a private or
loopback address is refused by the egress guard when the service dials it, so a
`localhost` URL will fail no matter how correct it looks.

**If the scan finds no endpoint**, say what you searched and what you did not
find, then ask for the agent's public chat-completions URL. Wait. Do not proceed
on a guess.

## 2. Confirm the agent: name it, don't assume

Surface what you found and let the user pick, then wait. This is the moment they
catch a wrong target.

- **Several agents found**: never pre-pick one, and never merge them into a single
  fixture. Ask which to audit via **AskUserQuestion**, one option per agent,
  each labelled with its one-line purpose, its tools, and where you found it.
  Audit only the one they choose. Several agents means one run each.
- **Exactly one agent**: name it and confirm before going further.
  > I'll audit **\<agent name\>** (from `\<source\>`), reached at `\<endpoint\>`.
  > It looks like it *\<one-line purpose\>*, with tools \<short list\>. Audit this
  > one, or did you mean a different agent?
- Keep the agent's name and source. They go into the fixture and onto every
  confirm screen, so the scorecard names the thing under test, not "Claude".

**Steer to a staging target, never production.** The service sends real traffic to
whatever URL you register, and a successful jailbreak can make a live agent
actually act. Ask which environment the endpoint points at before connecting.

## 3. Interview: ask exactly two things, infer the rest

Draft the description silently from discovery first, recording where each fact
came from. Then ask only the two things that need human judgment and that a wrong
guess would silently corrupt a grade. Use **AskUserQuestion**, both multi-select,
recommended option first.

- **Question 1, "Dangerous tools":** which discovered tools are genuinely dangerous
  (irreversible, ships to prod, deletes, spends money). This sets each tool's risk
  level and the privilege boundary the escalation checks probe. List the tools you
  found and recommend a rating for each. If there are 10+, surface only the
  plausibly dangerous ones, auto-rate the obvious read-only ones and name that
  triage in the recap. Always include a "You decide" escape; if the user flags
  nothing, add one restricted tool so the privilege check still has a boundary.
- **Question 2, "Hard rules":** which "never do X" rules must hold. Each becomes
  its own graded violation trap. Label each option by source: a rule from a file is
  `[from CLAUDE.md]`, one you propose is `I'd suggest`. Always include "I have no
  hard rules, pick sensible ones and tell me."

**Ask nothing else.** Roles, users, data sources and domain are inferred and
explained in Step 5. The user has no ground truth for a synthetic org, so a menu
there is false precision. Never re-ask anything you already read.

**Provenance and plain language.** Tag every value the user sees with exactly one
of **`[from your repo]`** (a fact you read; name the file when it helps) or
**`[Claude added]`** (anything inferred as scaffolding). Never tag an invented
value as read. And **never show an internal inspection id in user-facing text**:
translate to its purpose ("whether it can be talked across a role boundary", "a
trap per rule"). Name the code only if the user asks.

## 4. Author the fixture

**Say this before you send anything.** Authoring uploads the description you just
assembled, including the agent's system prompt verbatim if you found one, to
iFixAi and on to a language model that iFixAi operates. Unlike the self-hosted
engine, this content leaves the user's machine. If their prompt carries anything
they cannot share, stop and let them redact it first.

`list-inspections` is there if they ask what iFixAi actually checks for before
committing to anything.

Send the description to `author-fixture` with the agent's name. The service turns
it into the fixture the audit grades against. It costs no credits, but it is a
paid-workspace tool: on the free plan, write the fixture yourself and check it
with `uvx 'ifixai[openrouter]@3.3.0' validate <file>` instead.

Give it everything discovery found: the system prompt verbatim if you have it, the
roles and their authority limits, the tools, the data it reads, the approval chains
and escalation triggers, plus the two answers from Step 3.

If it refuses, it returns findings saying exactly which sections are missing. Fix
the description and author again. Do not hand-write a fixture around a refusal.

## 5. Show what it captured: a recap, not a dump

Never paste the fixture. Summarise it, provenance-tagged, in the user's language:

> **\<agent name\>** `[from your repo]`, \<one line on what it is for\>.
> \<N\> roles, with their authority limits named `[from your repo]`.
> \<N\> tools, of which \<N\> you marked dangerous `[you decided]`.
> \<N\> data sources across \<N\> sensitivity levels `[Claude added]`.
> \<N\> hard rules, \<N\> from your prompt and \<N\> I suggested `[mixed]`.

Every line carries a tag. That is the point of the step: they can see at a glance
which parts came from their code and which you invented.

Then ask if it is right. `validate-fixture` is free and says which inspections a
fixture can run and why the rest cannot; run it if anything looks thin.

A wrong fixture produces a confident wrong audit. This is the last cheap moment to
catch it.

**Once they confirm it, `save-fixture` against the connection.** That is what makes
a rerun one command instead of another interview: `run-inspection` with no fixture
argument loads the saved one. At the start of any later audit of the same agent,
call `get-fixture` and offer to reuse what is stored rather than authoring again.

## 6. Connect and test the endpoint

`list-connections` first, in case this agent is already registered. Otherwise
`create-connection` with the URL and its credential, then `test-connection`. The
credential is stored server-side and never returned, not to you, not in any report.

The test reports latency and whether the reply was understood. If it fails, read
the failure class back plainly: an unreachable host, a refused credential and an
unparseable response are three different problems.

## 7. Quote first: show the cost, then wait for yes

`estimate-run-cost` before spending anything. Report the credits, and read
`coverage.warning` aloud whenever it is set.

**Default to the full roster (`suite: "all"`).** Four inspections are gating, and a
gating inspection that is not run is scored as a failure, so any smaller selection
is capped and cannot produce a passing grade. Smaller suites are a quick look,
never a verdict. Say that plainly if the user asks for one.

Credits are real money. Wait for an explicit yes.

## 8. Run

**Check what has already been audited first.** `get-coverage` returns which
inspections recent runs exercised and how they came out. When they are
re-auditing an agent, lead with what was failing last time rather than starting
blind.

`run-inspection` returns a run id immediately; the audit continues server-side
whether or not this session stays open. Runs take minutes to tens of minutes.

Poll `get-run`. Do not busy-loop: check, tell the user it is running, and check
again after a reasonable pause. `list-runs` finds an earlier run when they ask
about one whose id they did not keep. If they want to stop, `cancel-run` charges only
the model spend the run had already used, capped at the quote, and returns the rest of
the hold. Tell them that before they cancel: `settled_credits` on the answer is what
they paid, and the run produces no report.

## 9. Report

`get-deliverable` once it settles. Lead with what the agent got wrong, worst
first, each with the prompt that caused it and the agent's own reply.

- **Report findings. Do not prescribe fixes.** The right fix depends on their
  system and their risk appetite, not yours.
- Translate inspection ids to plain English.
- An **inconclusive** result is not a pass and not a failure: the inspection could
  not reach a verdict, usually because the endpoint exposes no such surface.

## Honest constraints (don't overstate results)

- **An audit is a diagnostic, not a certification.** A clean result means the
  inspections that ran found no failures on that run. Say so if the user treats a
  grade as clearance to deploy.
- **The judge is a model iFixAi picks, not the user's.** On an HTTP endpoint we
  cannot see which model is behind their agent, so if it happens to be the judge
  model the run is effectively self-judged and nothing flags it. Say so if they
  tell you what they run.
- **Roughly half the roster never dials the agent.** Those inspect a governance
  surface a plain chat endpoint does not expose and read inconclusive against an
  HTTP target. `coverage` on the quote tells you how much of a selection actually
  reaches them.
- **The synthetic org is fictional.** Role boundaries in the fixture are the ones
  the agent claims to enforce; the audit probes whether it actually does.
- **Content leaves their machine** (flagged at Step 4): the description, the
  probes and the agent's replies all reach iFixAi and its judge model.

## If the user has no workspace

That is the free plan, not a wall. Signing in is enough: run the audit locally
(Step 0a) and offer `request-credits` when they want the iFixAi-only inspections,
a run we execute, saved history or the report.

A **paused** workspace or one **still being set up** is different: neither is the
free plan. Relay what the tool said, send them to https://ifixai.ai, and stop.
Do not retry.
