// PreToolUse hook for Bash, Write and Edit: allows only iFixAi's own steps, so an audit runs without a permission
// prompt for each of them. Anything else gets no answer from here and asks as usual.
//
// A Bash command is judged part by part, split at &&, ||, ;, | and new lines, as Claude Code judges a compound
// command (code.claude.com/docs/en/permissions, "Compound commands"). Each part must be one of:
// - a command one of iFixAi's tools handed out in this session, exactly as written (the upload of the selected
//   files, the key command, lock-agent's steps), its output at most sent to /dev/null or stderr joined to stdout;
// - once lock-agent answered in this session: the locked container's own commands, a look at its containers
//   (docker compose -f .ifixai/compose.yaml ps or logs) or mkdir -p inside .ifixai/;
// - a plain read of files in the working folder (ls, cat, grep, git log...), never an env file.
// At least one part is iFixAi's own. Once lock-agent answered, writing or editing files inside .ifixai/ is allowed
// too. No Node, an error, or anything it can't read for sure: no answer, so Claude Code asks as it always does.
import { closeSync, lstatSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/** iFixAi's tools, as Claude Code names them: this plugin's server, the claude.ai connector ("iFixAi"), or one
 *  added by hand as "ifixai". */
const OUR_TOOL = /^mcp__(?:plugin_ifixai_ifixai|claude_ai_ifixai|ifixai)__/i;
const LOCK_AGENT = new RegExp(`${OUR_TOOL.source}lock-agent$`, "i");

/** lock-agent's steps as its text gives them, for a server that hands out no `command` for them: its branch and its
 *  Docker commands. `docker-compose` is the same with the older binary. */
const COMPOSE = "-f .ifixai/compose.yaml";
const KIT_COMMANDS = new Set(
  ["docker info", "git switch -c ifixai-audit", "git checkout -b ifixai-audit"].concat(
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

/** The commands iFixAi's tools handed out in this transcript, and whether lock-agent answered without an error. */
function readSession(transcriptPath) {
  const ours = new Set();
  const lockCalls = new Set();
  const out = new Set();
  let locked = false;
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
      if (block?.type === "tool_use" && OUR_TOOL.test(String(block.name ?? ""))) {
        ours.add(block.id);
        if (LOCK_AGENT.test(String(block.name))) lockCalls.add(block.id);
      }
      if (block?.type === "tool_result" && ours.has(block.tool_use_id)) {
        collect(block.content, out);
        if (entry.toolUseResult !== undefined) collect(entry.toolUseResult, out);
        if (lockCalls.has(block.tool_use_id) && block.is_error !== true) locked = true;
      }
    }
  }
  return { commands: out, locked };
}

/** Whether a file path lands inside <cwd>/.ifixai/ once resolved, through any links: the kit's own folder.
 *  `folderToo`: the folder itself counts, for mkdir. */
function inKitFolder(filePath, cwd, folderToo = false) {
  if (typeof filePath !== "string" || !filePath || typeof cwd !== "string" || !isAbsolute(cwd)) return false;
  const rel = landsAt(filePath, cwd, join(realpathSync(cwd), ".ifixai"));
  if (rel === null) return false;
  return rel === "" ? folderToo : !outside(rel);
}

/** Where a path lands once resolved through any links, relative to `base`. Null for a link to nothing, or for a
 *  second name of a file that may live elsewhere (a hard link). */
function landsAt(filePath, cwd, base) {
  // the deepest part that exists is read through its links; the parts after it don't exist, so can't be links
  let existing = resolve(cwd, filePath);
  const rest = [];
  for (;;) {
    try {
      const stat = lstatSync(existing);
      if (!rest.length && stat.isFile() && stat.nlink > 1) return null;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(existing);
    if (parent === existing) return null;
    rest.unshift(basename(existing));
    existing = parent;
  }
  let real;
  try {
    real = join(realpathSync(existing), ...rest);
  } catch (error) {
    // a link to nothing
    if (error.code === "ENOENT") return null;
    throw error;
  }
  return relative(base, real);
}

const outside = (rel) => rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);

/** Output sent nowhere, or stderr joined to stdout and back: the only redirects a part may carry. */
const QUIET = /(?:[12]?>&[12]|&>[ \t]*\/dev\/null|[12]?>[ \t]*\/dev\/null)(?=[ \t\n;&|]|$)/y;

/** Where a command's parts meet. `&` alone, `|&`, `;;` and the like are never read as one: no answer. */
const SEPARATOR = /&&|\|\||;(?!;)|\n|\|(?!&)/y;

/** Shell syntax outside quotes that expands, substitutes, redirects, globs, groups or comments: no answer. */
const UNSAFE = /[$`\\()<>{}*?[\]#!~\x00-\x1f\x7f]/;

/** Where a part ends: the command's end or a separator, `&` included so that a lone one is refused after. */
const atPartEnd = (command, i) => i >= command.length || ";|&\n".includes(command[i]);

/** The end of a handed-out command at `i`, past any quiet redirects, when the part ends there; else -1. */
function handedOutEnd(command, i, allowed) {
  for (const handed of allowed) {
    if (!command.startsWith(handed, i)) continue;
    let j = i + handed.length;
    for (;;) {
      let k = j;
      while (command[k] === " " || command[k] === "\t") k++;
      QUIET.lastIndex = k;
      if (k > j && QUIET.test(command)) {
        j = QUIET.lastIndex;
        continue;
      }
      // anything glued on (`cmd'x`, `cmdx`) is another command
      if (k >= command.length || (atPartEnd(command, k) && !command.startsWith("&>", k))) return k;
      break;
    }
  }
  return -1;
}

/** A part's words with their quotes taken off, and where it ends; null for anything not plainly words. Single
 *  quotes are literal; double quotes only when nothing inside them expands. */
function wordsOf(command, i) {
  const words = [];
  for (;;) {
    while (command[i] === " " || command[i] === "\t") i++;
    QUIET.lastIndex = i;
    if (QUIET.test(command)) {
      i = QUIET.lastIndex;
      continue;
    }
    if (atPartEnd(command, i)) return { words, end: i };
    let word = "";
    while (!atPartEnd(command, i) && command[i] !== " " && command[i] !== "\t") {
      const c = command[i];
      if (c === "'" || c === '"') {
        const close = command.indexOf(c, i + 1);
        if (close < 0) return null;
        const inside = command.slice(i + 1, close);
        if (c === '"' && /[$`\\!]/.test(inside)) return null;
        word += inside;
        i = close + 1;
      } else if (UNSAFE.test(c)) {
        return null;
      } else {
        word += c;
        i++;
      }
    }
    words.push(word);
  }
}

/** A word that stays in the working folder and off its secrets: no env file, no path from / or ~, no `..`. */
function plainWord(word) {
  if (/\.env/i.test(word)) return false;
  if (word.split("=").some((piece) => piece.startsWith("/") || piece.startsWith("~"))) return false;
  if (word.split(/[/=]/).includes("..")) return false;
  return !(word.startsWith("-") && word.includes("/"));
}

/** Whether a path a read names lands inside the working folder through any links, and on no env file. */
function readable(path, cwd) {
  const rel = landsAt(path, cwd, realpathSync(cwd));
  return rel !== null && (rel === "" || (!outside(rel) && !rel.split(sep).some((part) => /^\.env/i.test(part))));
}

/** Plain reads, as Claude Code counts them read-only, minus the forms that write, run code or read a whole tree. */
const READS = new Set(["ls", "cat", "head", "tail", "wc", "grep", "echo", "printf", "pwd", "true", "sleep", "sort", "uniq", "git"]);
const FILE_READS = new Set(["ls", "cat", "head", "tail", "wc", "grep", "sort"]);
const GIT_READS = new Set(["status", "log", "diff", "show", "ls-files", "ls-tree", "rev-parse"]);

function plainRead([name, ...args], cwd) {
  if (!READS.has(name)) return false;
  const flags = args.filter((a) => a.length > 1 && a.startsWith("-"));
  // grep through a folder can reach an env file without naming it
  if (name === "grep" && flags.some((f) => /^-[^-]*[rRdD]/.test(f) || /^--[rd]/.test(f))) return false;
  // sort -o writes, and its long options can run a program
  if (name === "sort" && !flags.every((f) => /^-[bdfghiMnRrsuVz]+$/.test(f))) return false;
  // uniq's second file is where it writes
  if (name === "uniq" && !args.every((a) => /^-[cdiuz]+$/.test(a))) return false;
  // git's own options (-c, -C, --exec-path...) come before the subcommand
  if (name === "git" && (!GIT_READS.has(args[0]) || flags.some((f) => /^--(?:output|ext-diff|textconv)/.test(f)))) return false;
  return !FILE_READS.has(name) || args.every((a) => (a.length > 1 && a.startsWith("-")) || readable(a, cwd));
}

/** After lock-agent: a look at the kit's containers. */
function kitRead(words) {
  const at = words[0] === "docker" && words[1] === "compose" ? 2 : words[0] === "docker-compose" ? 1 : -1;
  return at > 0 && words[at] === "-f" && words[at + 1] === ".ifixai/compose.yaml" && ["ps", "logs"].includes(words[at + 2]);
}

/** After lock-agent: the kit's folders. */
function kitMkdir([name, flag, ...paths], cwd) {
  return name === "mkdir" && flag === "-p" && paths.length > 0 && paths.every((p) => !p.startsWith("-") && inKitFolder(p, cwd, true));
}

/** Whether every part of the command is allowed and at least one is iFixAi's own. */
function allowed(command, session, cwd) {
  const handed = [...session.commands, ...(session.locked ? KIT_COMMANDS : [])].filter(Boolean).sort((a, b) => b.length - a.length);
  let ours = false;
  let i = 0;
  for (;;) {
    while (command[i] === " " || command[i] === "\t" || command[i] === "\n") i++;
    // nothing, or nothing after an operator
    if (i >= command.length) return false;
    const end = handedOutEnd(command, i, handed);
    if (end >= 0) {
      ours = true;
      i = end;
    } else {
      const part = wordsOf(command, i);
      if (!part || !part.words.length || !part.words.every(plainWord)) return false;
      if (session.locked && (kitRead(part.words) || kitMkdir(part.words, cwd))) ours = true;
      else if (!plainRead(part.words, cwd)) return false;
      i = part.end;
    }
    if (i >= command.length) return ours;
    SEPARATOR.lastIndex = i;
    if (!SEPARATOR.test(command)) return false;
    i = SEPARATOR.lastIndex;
  }
}

function allow(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: reason } }));
}

function main() {
  const input = JSON.parse(readStdin() || "{}");
  if (typeof input.transcript_path !== "string" || !input.transcript_path) return;
  if (input.tool_name === "Write" || input.tool_name === "Edit") {
    // the path first: it is cheap, and most writes are elsewhere
    if (inKitFolder(input.tool_input?.file_path, input.cwd) && readSession(input.transcript_path).locked) allow("iFixAi's locked container");
    return;
  }
  if (input.tool_name !== "Bash") return;
  const command = String(input.tool_input?.command ?? "").trim();
  if (!command || typeof input.cwd !== "string" || !isAbsolute(input.cwd)) return;
  if (allowed(command, readSession(input.transcript_path), input.cwd)) allow("iFixAi's own steps");
}

try {
  main();
} catch (error) {
  // no answer: Claude Code asks as usual
  process.stderr.write(`ifixai hook: ${error instanceof Error ? error.message : String(error)}\n`);
}
