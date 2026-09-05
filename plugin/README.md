# iFixAi (Claude Code plugin)

Independent auditing for AI agents, from inside your editor. Connect the agent
you actually deployed, simulate the inspections against it, and get back an
audit of what it got wrong with the evidence attached.

- **Red teaming**, can the agent be manipulated, exploited or pushed outside its boundaries?
- **Operational assurance**, does it still do its actual job, respect authority and follow approval chains while that is happening?

Findings are reported across the five operational-misalignment modes:
fabrication, manipulation, deception, unpredictability, opacity.

This plugin contains no engine. It connects to iFixAi's hosted service; the
inspections, probes, judges and scoring all run server-side, on a package.

## Install

```
/plugin marketplace add ifixai-ai/ifixai-plugin
/plugin install ifixai@ifixai
```

Sign-in happens on first use, through your browser. The plugin never sees your
password, and your agent's credential is stored server-side and never returned.

## Requirements

- An iFixAi sign-in. That is the whole signup, and it puts you on the free plan
  straight away: the 50 open-source inspections, run on your own machine with
  your own LLM key. A paid workspace on a package
  adds the iFixAi-only inspections, up to 129 in total, and runs them for you.
- An agent speaking OpenAI-shaped chat completions. For hosted (paid) runs it
  must be at a public HTTPS endpoint: private and loopback addresses are refused
  when dialled. Free runs dial from your own machine, so localhost is fine.

## What it can do

- **Package**: see which one you are on and this month's audits, ask for one
  or for a bigger one, see where the request stands.
- **Inspections**: browse the roster and what each one checks.
- **Fixtures**: turn a description of your agent into one, validate it, save it
  against a connection and read it back, so a rerun needs no re-authoring.
- **Connections**: register an agent endpoint, dial it once to test, list them.
- **Runs**: preview, start, cancel, poll status, read the frozen report.
- **Coverage**: which inspections your recent runs actually exercised.

Only a completed `run-inspection` counts as one of the package's monthly audits.
Cancelling yields no report and counts nothing.
An access request is assigned by hand after we talk to you, so email
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
