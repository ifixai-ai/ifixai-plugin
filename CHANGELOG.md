# Changelog

Versions match `plugin/.claude-plugin/plugin.json` and the git tag of the same
name.

## 0.2.0 — 2026-08-20

- Free tier. Signing in is now enough: the 45 inspections that ship in the
  open-source engine run on your own machine with your own LLM key, nothing
  billed and nothing stored with us. A paid workspace still adds the 57
  iFixAi-only inspections, hosted runs, saved history and the report.
- Upgrading works mid-session. The tier is resolved per call, so the tool list
  never changes and no reconnect is needed.
- `search` and `fetch` added, so the connector also works in clients that
  require them.
- The pro roster is no longer visible to a free account: names, descriptions and
  ids of the iFixAi-only inspections are filtered server-side. Only the count of
  what exists is shown.
- Repository renamed to `ifixai-plugin`. The install command is unchanged.

## 0.1.0 — 2026-08-11

- First release: the `ifixai` skill and the remote MCP server at
  `mcp.ifixai.ai`, for hosted, credit-billed audits.
