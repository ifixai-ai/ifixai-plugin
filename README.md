# iFixAi, Claude Code plugin

Independent auditing for AI agents, from inside Claude Code. This repo carries
the `ifixai` plugin: a connector to iFixAi's hosted service.

```
/plugin marketplace add ifixai-ai/ifixai-plugin
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

Only the plugin: a manifest, an MCP server pointer, and a skill that tells Claude
the order to call things in. There is no engine here. The inspections, probes,
judges and scoring live in iFixAi.

## Two tiers

**Free.** Sign in and the 50 open-source inspections run on your own machine,
with your own LLM key, against your own agent. Nothing is billed, nothing is
saved with us, and your key never reaches us.

**Paid.** A workspace on a paid package adds the
iFixAi-only inspections, up to 129 in total, runs we execute for you, saved
history and the report. Ask for one with `request-access`; a person assigns it.

## Getting access

Signing in from inside Claude Code is the whole signup. It puts you on the free
plan immediately, with no approval and no waiting.

You also need an agent reachable at a public HTTPS endpoint speaking
OpenAI-shaped chat completions.

## Other clients

The plugin is the Claude Code packaging. The connector underneath is a plain MCP
server, so any client can use it directly:

```
https://mcp.ifixai.ai/mcp
```

Claude, Cursor, VS Code and Windsurf take it as a remote MCP server in connector
settings. ChatGPT takes it as a custom connector with developer mode on. Full
setup and the tool list: https://ifixai.ai

## Links

- Product: https://ifixai.ai
- Support: support@ifixai.ai
