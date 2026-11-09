// PreToolUse hook for Bash: allows only iFixAi's own commands, so an audit runs without a permission prompt for
// each of them. Any other command gets no answer from here and asks as usual.
//
// Allowed, exactly as written, nothing added or changed:
// - a command one of iFixAi's tools handed out in this session (the upload of the selected files, the key command);
// - the locked container's own Docker commands, as lock-agent's steps give them.
// No Node, an error, or anything unexpected: no answer, so Claude Code asks as it always does.
import { closeSync, openSync, readSync, statSync } from "node:fs";

/** iFixAi's tools, as Claude Code names them: this plugin's server, the claude.ai connector ("iFixAi"), or one
 *  added by hand as "ifixai". */
const OUR_TOOL = /^mcp__(?:plugin_ifixai_ifixai|claude_ai_ifixai|ifixai)__/i;

/** lock-agent's Docker commands. `docker-compose` is the same with the older binary. */
const COMPOSE = "-f .ifixai/compose.yaml";
const KIT_COMMANDS = new Set(
  ["docker info"].concat(
    ...["docker compose", "docker-compose"].map((dc) => [
      `${dc} ${COMPOSE} up -d --build`,
      `${dc} ${COMPOSE} down -v`,
      `${dc} ${COMPOSE} logs tunnel | grep -o 'https://[a-z0-9-]*\\.trycloudflare\\.com'`,
      `${dc} ${COMPOSE} logs --no-log-prefix gate | grep -E '^(blocked|failed)' | sort | uniq -c`,
    ]),
  ),
);

/** How much of the transcript's end is read: the commands an audit runs come from its latest tool results. */
const TAIL_BYTES = 8 * 1024 * 1024;

function readStdin() {
  const chunks = [];
  const buf = Buffer.alloc(65536);
  for (;;) {
    let n;
    try {
      n = readSync(0, buf, 0, buf.length, null);
    } catch (error) {
      if (error.code === "EAGAIN") continue;
      if (error.code === "EOF") break;
      throw error;
    }
    if (n === 0) break;
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function readTail(path) {
  const size = statSync(path).size;
  const start = Math.max(0, size - TAIL_BYTES);
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    const text = buf.toString("utf8");
    // a cut first line is not JSON: drop it
    return start > 0 ? text.slice(text.indexOf("\n") + 1) : text;
  } finally {
    closeSync(fd);
  }
}

/** Every string under a "command" key, at any depth. */
function commandsIn(value, out) {
  if (Array.isArray(value)) for (const v of value) commandsIn(v, out);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "command" && typeof v === "string") out.add(v.trim());
      else commandsIn(v, out);
    }
  }
}

/** The "command" values in a tool result: its text blocks, or the result itself, read as JSON. */
function collect(content, out) {
  const texts = typeof content === "string" ? [content] : Array.isArray(content) ? content.filter((b) => b && b.type === "text").map((b) => String(b.text ?? "")) : [];
  for (const text of texts) {
    try {
      commandsIn(JSON.parse(text), out);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  if (content && typeof content === "object" && !Array.isArray(content)) commandsIn(content, out);
}

/** The commands iFixAi's tools handed out in this transcript. */
function handedOut(transcriptPath) {
  const ours = new Set();
  const out = new Set();
  for (const line of readTail(transcriptPath).split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type === "tool_use" && OUR_TOOL.test(String(block.name ?? ""))) ours.add(block.id);
      if (block?.type === "tool_result" && ours.has(block.tool_use_id)) {
        collect(block.content, out);
        if (entry.toolUseResult !== undefined) collect(entry.toolUseResult, out);
      }
    }
  }
  return out;
}

function allow(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: reason } }));
}

function main() {
  const input = JSON.parse(readStdin() || "{}");
  if (input.tool_name !== "Bash") return;
  const command = String(input.tool_input?.command ?? "").trim();
  if (!command) return;
  if (KIT_COMMANDS.has(command)) return allow("iFixAi's locked container");
  if (typeof input.transcript_path !== "string" || !input.transcript_path) return;
  if (handedOut(input.transcript_path).has(command)) allow("A command iFixAi handed out");
}

try {
  main();
} catch (error) {
  // no answer: Claude Code asks as usual
  process.stderr.write(`ifixai hook: ${error instanceof Error ? error.message : String(error)}\n`);
}
