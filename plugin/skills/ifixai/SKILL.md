---
name: ifixai
description: Audit the user's deployed AI agent with iFixAi, hosted by iFixAi, free or on a package. You find the agent in their repo, build its simulation environment, connect its endpoint, run the audit and hand over its report. Use when the user asks to run their free iFixAi audit, to audit, inspect or stress-test an agent, read their iFixAi package, or read a past run.
---

# iFixAi: audit your deployed agent

Three stages: **Connect** the agent, build its **Simulation environment** (what the agent is supposed to do, which every inspection is judged against), run the **Audit**. You are the operator, not the thing being tested.

Every audit needs an HTTP endpoint iFixAi can reach. An agent that runs only on this machine runs in a locked Docker container by default: `lock-agent` gives the files and steps, a tunnel included. Only if the user insists on skipping Docker does it go out through a bare quick tunnel, `cloudflared tunnel --url http://localhost:<port>`: `test-connection` says what to do with the address it prints.

With the agent's code in this folder, ask the user nothing: "Audit my agent with iFixAi." is the go-ahead, for the free audit and a package audit alike, and the code answers the rest (the test copy, the key's name, role logins, the sandbox). Without the code (a web chat), ask only the address of a test copy of the agent and what it does. The package rules and "findings, never fixes" are in the server instructions. They are not repeated here.

## 0. Plan

`get-plan`.
- `free`: `claim-fast-audit` (a request to audit is the request to claim it), or `redeem-code` when they gave a code. A refused claim says what to do: relay it as it stands.
- `paid`: read back the package and the audits left this month with the reset date.
- `no package`: it runs what `grants` holds, hosted; read that back. A grant is used once by its date, never reset. A Free audit left: take its path below.
- A grant used up or expired: say so, then the `upgrade` line.
- "Paused" or "being set up": relay what the tool said, point to https://ifixai.ai, stop.

## Free audit

The free audit's path is short, with no question.
- Find the agent as in 1, and its test copy: a local or staging URL in the code, never a live production one.
- Connect it (3), build its simulation environment (4), then `preview-run` with the `connectionId`, reading nothing out of it, and `run-inspection` with `targetIsSandboxed: true`. No bundles, no sandbox pick, no role logins: it runs as it is.
- While it runs, say only the gap lines a reply's `say` gives, like "Found a critical gap in Fabrication.", each once. Never how many inspections it runs or has run, never what a gap is.
- At the end, give `get-deliverable`'s line as it stands, "Your audit found <n> gaps, <c> of them critical: <link>", and nothing after it.
## 1. Find the agent

```bash
grep -rniE "IFIXAI_HTTP_ENDPOINT|OPENAI_BASE_URL|ANTHROPIC_BASE_URL|AGENT_URL|base_url" --exclude='.env*' --exclude='*.env' --exclude='*.env.*' .
ls .claude/agents/ agents/ 2>/dev/null; grep -rlniE "system_prompt|SystemMessage|Agent\(|create_agent|crewai|langgraph|autogen" --include="*.py" --include="*.ts" --include="*.yaml" .
```

Accept a URL the repo states as the agent's own chat API, in any request format: when it isn't OpenAI's, give `create-connection` the `requestBody` and `replyPath` the code shows. An MCP `url` is a tool the agent calls, not its endpoint. The address to register is the test copy's: a local or staging URL, with seeded data, never a live production one. Nothing found in the code: ask only the address of a test copy and what it does.

## 2. Pick it

Several agents: the one the user named, else the one the repo's entry point serves, one run each. What it is for comes from its code. Ask nothing.
## 3. Connect

`list-connections`, else `create-connection` then `test-connection`. A row with `saved_environment` already has its simulation environment: skip 4 and 5, ask nothing. Read failures back plainly: an unreachable host, a refused key and an unreadable reply are different problems. Read out what `test-connection` says about role logins and `forwarding` as it stands.

The agent's key never goes through chat: never ask for it in chat, and never read, list, print or cat a `.env` file, not even its names (`lock-agent`'s hosts-only command is the one exception). An agent with a key is saved without it, and the reply's `key` gives it two ways. In Claude Code, or any client with a shell, pass `create-connection` and `test-connection` the name of the env var that holds the key as `keyEnvVar`, from the agent's code, like `os.environ["OPENAI_API_KEY"]` or `process.env.OPENAI_API_KEY`; never the value. Then run the key command from the agent's repo as it stands: it reads that one variable itself. Anywhere else, give the user the key link to paste the key on a page, and test once they say it is done. Waiting for the key, `test-connection` gives back the link and command already handed out, which still work until used or 30 minutes are up, then new ones. For a refused key, call `create-connection` again with the `connectionId`, the same setup and `newKey: true`: its reply has a new link and command. Any other change keeps the stored key, so never give it again.

## 4. Build the simulation environment

It is built from the whole agent repo: the selected files, system prompt included, go to iFixAi. `select-repo-files` with the list that `test-connection`'s `repo_files.command` prints, run as it stands from the repo root, never a listing of your own. With a shell, run its `upload.command` from the repo root as it stands, then `build-simulation-env` with its `uploadId`: never retype a file. Without one, or if the command fails, send the files it returns as `files`, each with its exact text and the sha256 that `shasum -a 256 <file>` prints for it (none without a shell). Pass the purpose if they gave one, the commit as `source` and the `connectionId`, so it saves the environment itself. Several `candidates`: the agent picked in 2. Refused: do what the refusal says, then author again. Never hand-write around a refusal.

Last resort, only when there is no repo this session can read: say "I can't read the repo from here, so describe it instead", call `build-simulation-env` with no input and give them the brief it returns to paste into their own coding agent. Its answer goes back as `markdown`, with the `connectionId`.

## 5. Saved

It comes back as a `summary`, never the environment itself. Recap nothing. Ask nothing, and never show inspection ids. `build-simulation-env` saved it: later runs on that connection reuse it. No `saved` in the reply means nothing was kept: do what its `next` says.

On a package, role logins come from the code: when it or its seed data names a test login per role, `set-role-logins` with them. Without them the run still works. A first audit (no package) skips it: role logins and the sandbox come after its report.

## 6. Preview

`preview-run` with the `connectionId`, then do what its `next` says. A free audit's preview has nothing to count: read nothing out of it. Another first audit (no package) reads `runs` out. A package runs the whole package unless the user named bundles. Read out `coverage.warning` when set.

`sandbox` with `reached: false` on a package: with the agent's code here it is wired by default. `wire-sandbox` with the `connectionId` and `envFile: true`, and apply its `prompt` to the test copy yourself, with `rest_url` as `IFIXAI_SANDBOX_URL` only in the test copy's untracked env file, then restart it. Its step 1 comes first: create a branch and switch to it, even when this folder is already a test copy. A sandbox setting already in the code still needs checking against the prompt, read copies included. Never print the address. Then the Check: `test-connection` with `targetIsSandboxed: true`, and read `tool_calls_message` out. Without the code, read `sandbox.message` out instead.

A leaked address: `rotate-sandbox`, then wire again.

## 7. Audit

`run-inspection`, then do what its `next` says. In Claude Code it holds until the run ends and shows its progress in one line that updates itself; elsewhere `get-run` waits for news before it answers. Between calls say nothing but the lines in `say`: no progress read-outs, no recaps, never a percentage or a time estimate. On clients with MCP Apps the run card refreshes itself. A refusal names its way out: follow it. `stop-run` stops a run and keeps what finished as a partial report; tell the user first.

## 8. Report

At the end, give the user `get-deliverable`'s message and link as they stand. Describe findings only when the user asks: then call `get-findings` and keep to its findings and proof, in its order, with no count, score or fix.

## Honest limits

- A clean result is a diagnostic, not a certification.
- The simulation environment's test users are made up.
- Descriptions, probes and replies reach iFixAi and its judges.
