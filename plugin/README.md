# iFixAi (Claude Code plugin)

Independent auditing for AI agents, from inside Claude Code. Connect the agent
you actually deployed, simulate the inspections against it, and get back an
audit of what it got wrong with the evidence attached.

- **Red teaming**, can the agent be manipulated, exploited or pushed outside its boundaries?
- **Operational assurance**, does it still do its actual job, respect authority and follow approval chains while that is happening?

Findings are reported across the five operational-misalignment modes:
fabrication, manipulation, deception, unpredictability, opacity.

This plugin contains no engine. It connects to iFixAi's hosted service; the
inspections, probes, judges and scoring all run server-side, billed in credits.

## Install

```
/plugin marketplace add ifixai-ai/ifixai-connector
/plugin install ifixai@ifixai
```

Sign-in happens on first use, through your browser. The plugin never sees your
password, and your agent's credential is stored server-side and never returned.

## Requirements

- An iFixAi account. iFixAi is in private beta: signing in from inside Claude
  Code is the whole signup and it logs your request. Until it is approved the
  tools say so plainly.
- An agent reachable at a public HTTPS endpoint speaking OpenAI-shaped chat
  completions. Private and loopback addresses are refused when dialled.

## What it can do

- **Wallet and credits**: check the balance, request more, see pending requests.
- **Inspections**: browse the roster and what each one checks.
- **Fixtures**: turn a description of your agent into one, validate it, save it
  against a connection and read it back, so a rerun needs no re-authoring.
- **Connections**: register an agent endpoint, dial it once to test, list them.
- **Runs**: quote the cost, start, cancel, poll status, read the frozen report.
- **Coverage**: which inspections your recent runs actually exercised.

Only `run-inspection` spends credits, and cancelling returns the whole hold.
A credit request is reviewed manually with no automatic alert behind it, so email
support@ifixai.ai if it is urgent.

## How it stays independent

A standardised battery you did not write, a judge model iFixAi picks rather than
your agent's own, a fixed passing bar you cannot tune, and a replayable manifest
so any result reproduces.

One caveat worth knowing: on an HTTP endpoint we cannot see which model is behind
your agent. If it happens to be the judge model, that run is effectively
self-judged and nothing detects it. Tell us and we will change the judge.

An audit is a diagnostic, not a certification. A clean result means the
inspections that ran found no failures on that run.

## Links

- Product: https://ifixai.ai
- Support: support@ifixai.ai
