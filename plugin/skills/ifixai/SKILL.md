---
name: ifixai
description: Audit the user's deployed AI agent with iFixAi, hosted by iFixAi, free or on a package. You find the agent in their repo, build its simulation environment, connect its endpoint, run the audit and hand over its report. Use when the user asks to run their free iFixAi audit, to audit, inspect or stress-test an agent, read their iFixAi package, or read a past run.
---

# iFixAi: audit your deployed agent

Three stages: **Connect** the agent, build its **Simulation environment** (what the agent is supposed to do, which every inspection is judged against), run the **Audit**. You are the operator, not the thing being tested.

Every audit needs a reachable HTTP endpoint. No endpoint, no audit: say so and stop.

The demo, the package rules, the test-copy question and "findings, never fixes" are in the server instructions. They are not repeated here.

## 0. Plan

`get-plan`. The demo comes before it only for someone who asks what iFixAi is or makes no request: never when they ask to run their audit, or once `get-plan` shows a Fast audit left.
- `free`: offer `claim-fast-audit`, or `redeem-code` when they have a code. Asked to run their free audit, claim it without asking. A refused claim says what to do: relay it as it stands.
- `paid`: read back the package and the audits left this month with the reset date.
- `no package`: it runs what `grants` holds, hosted; read that back. A grant is used once by its date, never reset. A Fast audit left: take the free audit's path below.
- A grant used up or expired: say so, then the `upgrade` line.
- "Paused" or "being set up": relay what the tool said, point to https://ifixai.ai, stop.

## Free audit

A Fast audit is the free audit, and its path is short: one question, then the audit.
- Find the agent as in 1. Several agents: ask which one.
- Then ask this once, in place of the confirmation, the staging and test-copy questions and the go-ahead: "Your agent at <host> is a test copy, not production, and I'll start your free audit now. Go ahead?" A yes answers all of them. Anything else: start nothing, as in 7.
- Then start. Connect it (3), build its simulation environment (4) and recap it in a line (5) with no role-login question, then `preview-run` with the `connectionId`, reading nothing out of it, and `run-inspection` with `targetIsSandboxed: true`. No bundles, no sandbox pick: it runs as it is.
- While it runs, say only the problems found so far: "<n> problems found so far", from `progress.failed`. Never how many inspections it runs or has run.
- At the end, give `get-deliverable`'s line as it stands, "Your audit found <n> problems, <c> of them critical. Your free report opens the <s> most serious: <link>", and nothing after it.

## 1. Find the agent

```bash
grep -rniE "IFIXAI_HTTP_ENDPOINT|OPENAI_BASE_URL|ANTHROPIC_BASE_URL|AGENT_URL|base_url" --exclude='.env*' --exclude='*.env' --exclude='*.env.*' .
ls .claude/agents/ agents/ 2>/dev/null; grep -rlniE "system_prompt|SystemMessage|Agent\(|create_agent|crewai|langgraph|autogen" --include="*.py" --include="*.ts" --include="*.yaml" .
```

Accept only a URL the repo states as the agent's own chat API (`POST /v1/chat/completions`). An MCP `url` is a tool the agent calls, not its endpoint. Nothing found: say what you searched and ask for the URL.

## 2. Confirm it

Several agents: ask which one, one run each. One agent: confirm in a line, "I'll audit **<name>** at `<endpoint>`. It looks like it <purpose>. This one?" Unless they already said it is a test copy, ask whether the URL is staging or production, and steer to staging: probes are real traffic. A free audit asks only its one question instead.

## 3. Connect

`list-connections`, else `create-connection` then `test-connection`. A row with `saved_environment` already has its simulation environment: skip 4 and 5, ask nothing. Read failures back plainly: an unreachable host, a refused key and an unreadable reply are different problems. Read out what `test-connection` says about role logins and `forwarding` as it stands.

The agent's key never goes through chat: never ask for it in chat, and never read, list, print or cat a `.env` file, not even its names. An agent with a key is saved without it, and the reply's `key` gives it two ways. In Claude Code, or any client with a shell, run the key command from the agent's repo, with `AGENT_API_KEY` swapped for the name of the env var that holds the key: take that name from the agent's code, like `os.environ["AGENT_API_KEY"]` or `process.env.AGENT_API_KEY`, else ask the user for the name, never the value. The command reads that one variable itself. Anywhere else, give the user the key link to paste the key on a page, and test once they say it is done. Waiting for the key, `test-connection` gives back the link and command already handed out, which still work until used or 30 minutes are up, then new ones. For a refused key, call `create-connection` again with the `connectionId`, the same setup and `newKey: true`: its reply has a new link and command. Any other change keeps the stored key, so never give it again.

## 4. Build the simulation environment

It is built from the whole agent repo. Say the selected files, system prompt included, go to iFixAi, and let them redact. Then `select-repo-files` with `git ls-files` and sizes. With a shell, run its `upload.command` from the repo root as it stands, then `build-simulation-env` with its `uploadId`: never retype a file. Without one, or if the command fails, send the files it returns as `files`, each with its exact text and the sha256 that `shasum -a 256 <file>` prints for it (none without a shell). Pass the purpose they confirmed, the commit as `source` and the `connectionId`, so it saves the environment itself. Several `candidates`: ask which. Refused: do what the refusal says, then author again. Never hand-write around a refusal.

Last resort, only when there is no repo this session can read: say "I can't read the repo from here, so describe it instead", call `build-simulation-env` with no input and give them the brief it returns to paste into their own coding agent. Its answer goes back as `markdown`, with the `connectionId`.

## 5. Recap

It comes back as a `summary`, never the environment itself: recap that briefly, tagged from `fromFiles`, naming what `notInFiles` lists as assumed. Ask nothing, and never show inspection ids:

> **Support bot** (from `app/prompts/support.py`, `app/tools.py`): 3 roles, 12 tools, 4 rules.
> Assumed, because the repo showed nothing: audit logging, risky actions.

`build-simulation-env` saved it: later runs on that connection reuse it. No `saved` in the reply means nothing was kept: do what its `next` says.

Then ask once, except on a free audit: "Does your agent sign people in by role? If so, give me a test token for each of these roles: <roles>." With tokens, `set-role-logins`. Without them the run still works.

## 6. Preview

`preview-run` with the `connectionId`. Offer the whole package first, then one or two whole bundles, each as "<N> inspections across <C> categories" from the preview. Read out `coverage.warning` when set. A free audit's preview has nothing to offer or count: read nothing out of it.

`sandbox` with `reached: false`: read its `message` out and wait for a pick, unless the user already picked: then carry on.
- 1: `wire-sandbox` with the `connectionId`. If this session can edit the agent's repo, pass `envFile: true` and apply its `prompt` there yourself, with `rest_url` as `IFIXAI_SANDBOX_URL` only in the test copy's untracked env file, then restart or redeploy it. Its step 1 comes first: create a branch and switch to it, even when this folder is already a test copy. A sandbox setting already in the code still needs checking against the prompt, read copies included. Otherwise its widget shows the prompt with the address behind a Copy button, for the user's coding agent. Never print the address. Once wired, offer the Check: the test-copy question (once per run, never again once answered, never when they already said it is a test copy), then `test-connection` with `targetIsSandboxed`. Read `tool_calls_message` out.
- 2: carry on to the test-copy question.
- 3: stop. Nothing runs.

`sandbox` with `reached: true`: read its `message` out. If the user says check, run the Check as above.

A leaked address: `rotate-sandbox`, then wire again.

## 7. Audit

We stress test your agent inside the simulation environment. Every result is
judged by AI models your agent never runs on. Say that when you introduce the audit.

`run-inspection`, then poll `get-run` without busy-looping. Read progress as "N of T inspections run so far, P passed, F failed", never a percentage or a time estimate. A free audit's progress has only `failed`: "<n> problems found so far", nothing else. On clients with MCP Apps the poll draws the Audit screen, the categories grouped into the six bundles, or a free audit's problems found so far. A refusal names its way out: follow it. `stop-run` stops a run and keeps what finished as a partial report; tell the user first.

Sandbox answer is no: start nothing. Help them make a test copy with fake data. A local copy goes out through `cloudflared tunnel --url http://localhost:<port>` plus an auth header.

## 8. Report

At the end, give the user `get-deliverable`'s message and link as they stand. Never describe findings: if asked, point to the report.

## Honest limits

- A clean result is a diagnostic, not a certification.
- The simulation environment's test users are made up.
- Descriptions, probes and replies reach iFixAi and its judges.
