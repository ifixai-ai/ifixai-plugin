# iFixAi, Claude Code plugin

Independent auditing for AI agents, from inside Claude Code. This repo carries
the `ifixai` plugin: a connector to iFixAi's hosted service.

```
/plugin marketplace add ifixai-ai/ifixai-connector
/plugin install ifixai@ifixai
```

## What it does

Connect the agent you actually deployed, simulate the inspections against it,
and get back an audit of what it got wrong with the evidence attached.

- **Red teaming**, can the agent be manipulated, exploited or pushed outside its boundaries?
- **Operational assurance**, does it still do its actual job, respect authority and follow approval chains while that is happening?

Findings are reported across the five operational-misalignment modes:
fabrication, manipulation, deception, unpredictability, opacity.

## What's in this repo

Only the connector: a plugin manifest, an MCP server pointer, and a skill that
tells Claude the order to call things in. There is no engine here. The
inspections, probes, judges and scoring all run server-side, and work is billed
in credits.

## Getting access

iFixAi is in private beta. Create an account at
https://ifixai.ai and an operator opens your workspace.
Until then the tools will tell you plainly that you are not in yet.

You also need an agent reachable at a public HTTPS endpoint speaking
OpenAI-shaped chat completions.

## Links

- Product: https://ifixai.ai
- Support: support@ifixai.ai
