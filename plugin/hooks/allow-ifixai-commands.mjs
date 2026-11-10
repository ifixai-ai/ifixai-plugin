// PreToolUse hook for Bash, Write and Edit: allows only iFixAi's own steps, so an audit runs without a permission
// prompt for each of them. Anything else gets no answer from here and asks as usual.
//
// A Bash command is judged part by part, split at &&, ||, ;, | and new lines, as Claude Code judges a compound
// command (code.claude.com/docs/en/permissions, "Compound commands"). Each part must be one of:
// - a command one of iFixAi's tools handed out in this session, exactly as written (the upload of the selected
//   files, the key command, lock-agent's steps), its output at most sent to /dev/null or stderr joined to stdout;
// - once lock-agent answered in this session: the locked container's own commands, a look at its containers
//   (docker compose -f .ifixai/compose.yaml ps or logs) or mkdir -p inside .ifixai/;
// - a plain read of files in the working folder (ls, cat, grep, git log, a sed that only substitutes...), never an
//   env file but the examples (.env.example...); echo or printf, with at most `$?` or a `$( )` judged by these same
//   rules inside a double-quoted argument; which or command -v; a test or [ ] that checks a file or a string.
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
const QUIET = /(?:[12]?>&[12]|&>[ \t]*\/dev\/null|[12]?>[ \t]*\/dev\/null)(?=[ \t\n;&|)]|$)/y;

/** Where a command's parts meet. `&` alone, `|&`, `;;` and the like are never read as one: no answer. */
const SEPARATOR = /&&|\|\||;(?!;)|\n|\|(?!&)/y;

/** Shell syntax outside quotes that expands, substitutes, redirects, globs, groups or comments: no answer. */
const UNSAFE = /[$`\\()<>{}*?[\]#!~\x00-\x1f\x7f]/;

/** Where a part ends: the command's end or a separator, `&` included so that a lone one is refused after. Inside
 *  a `$( )`, its `)` too. */
const atPartEnd = (command, i, inner) => i >= command.length || ";|&\n".includes(command[i]) || (inner && command[i] === ")");

/** The end of a handed-out command at `i`, past any quiet redirects, when the part ends there; else -1. */
function handedOutEnd(command, i, allowed, inner) {
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
      if (k >= command.length || (atPartEnd(command, k, inner) && !command.startsWith("&>", k))) return k;
      break;
    }
  }
  return -1;
}

/** A double-quoted string from its opening quote at `i`: where it ends, its text, and whether it holds `$?` or a
 *  `$( )`, which is judged as a command of its own and never nests. Null for anything else that expands. */
function doubleQuoted(command, i, ctx, inner) {
  let text = "";
  let dynamic = false;
  for (let j = i + 1; j < command.length; ) {
    const c = command[j];
    if (c === '"') return { end: j + 1, text, dynamic };
    if (c === "$" && command[j + 1] === "?") {
      dynamic = true;
      j += 2;
    } else if (c === "$" && command[j + 1] === "(" && command[j + 2] !== "(" && !inner) {
      const sub = judge(command, j + 2, ctx, true);
      if (!sub) return null;
      dynamic = true;
      j = sub.end + 1;
    } else if ("$`\\!".includes(c)) {
      return null;
    } else {
      text += c;
      j++;
    }
  }
  return null;
}

/** A part's words with their quotes taken off, and where it ends; null for anything not plainly words. Single
 *  quotes are literal. A word's kind: plain; dynamic, with `$?` or a `$( )` in it; or test's bare `[`, `]` or `!=`. */
function wordsOf(command, i, ctx, inner) {
  const words = [];
  for (;;) {
    while (command[i] === " " || command[i] === "\t") i++;
    QUIET.lastIndex = i;
    if (QUIET.test(command)) {
      i = QUIET.lastIndex;
      continue;
    }
    if (atPartEnd(command, i, inner)) return { words, end: i };
    const bare = /\[|\]|!=/y;
    bare.lastIndex = i;
    if (bare.test(command) && (command[bare.lastIndex] === " " || command[bare.lastIndex] === "\t" || atPartEnd(command, bare.lastIndex, inner))) {
      words.push({ value: command.slice(i, bare.lastIndex), kind: "test" });
      i = bare.lastIndex;
      continue;
    }
    let value = "";
    let kind = "plain";
    while (!atPartEnd(command, i, inner) && command[i] !== " " && command[i] !== "\t") {
      const c = command[i];
      if (c === "'") {
        const close = command.indexOf("'", i + 1);
        if (close < 0) return null;
        value += command.slice(i + 1, close);
        i = close + 1;
      } else if (c === '"') {
        const quoted = doubleQuoted(command, i, ctx, inner);
        if (!quoted) return null;
        if (quoted.dynamic) kind = "dynamic";
        value += quoted.text;
        i = quoted.end;
      } else if (c === "$" && command[i + 1] === "?") {
        kind = "dynamic";
        i += 2;
      } else if (UNSAFE.test(c)) {
        return null;
      } else {
        value += c;
        i++;
      }
    }
    words.push({ value, kind });
  }
}

/** The example env files, which hold no secrets: the one exception to the env-file rule. */
const ENV_EXAMPLES = new Set([".env.example", ".env.sample", ".env.template", ".env.dist"]);
const envFile = (name) => /\.env/i.test(name) && !ENV_EXAMPLES.has(name);

/** A path that stays in the working folder: none from / or ~, no `..`, no path in a flag. */
function inFolder(word) {
  if (word.split("=").some((piece) => piece.startsWith("/") || piece.startsWith("~"))) return false;
  if (word.split(/[/=]/).includes("..")) return false;
  return !(word.startsWith("-") && word.includes("/"));
}

/** A word that stays in the working folder and off its secrets: no env file but the examples. */
const plainWord = (word) => inFolder(word) && !word.split(/[/=]/).some(envFile);

/** Whether a path a read names lands inside the working folder through any links, and on no env file. */
function readable(path, cwd) {
  const rel = landsAt(path, cwd, realpathSync(cwd));
  return rel !== null && (rel === "" || (!outside(rel) && !rel.split(sep).some(envFile)));
}

/** Plain reads, as Claude Code counts them read-only, minus the forms that write, run code or read a whole tree. */
const READS = new Set(["ls", "cat", "head", "tail", "wc", "grep", "pwd", "true", "sleep", "sort", "uniq", "git"]);
const FILE_READS = new Set(["ls", "cat", "head", "tail", "wc", "grep", "sort"]);
const GIT_READS = new Set(["status", "log", "diff", "show", "ls-files", "ls-tree", "rev-parse"]);

function plainRead([name, ...args], cwd) {
  if (!READS.has(name) || !args.every(plainWord)) return false;
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

/** A sed script made only of s commands joined by `;`, flags from g, p, I and digits: no w, e, r or any other
 *  command, so it writes nothing, runs nothing and reads no other file. */
function substitutesOnly(script) {
  let i = 0;
  for (;;) {
    while (script[i] === " ") i++;
    const delimiter = script[i + 1];
    if (script[i] !== "s" || !delimiter || delimiter === "\\" || delimiter === "\n") return false;
    i += 2;
    for (let field = 0; field < 2; field++) {
      for (;;) {
        const c = script[i];
        if (c === undefined || c === "\n") return false;
        if (c === "\\") {
          if (script[i + 1] === undefined || script[i + 1] === "\n") return false;
          i += 2;
          continue;
        }
        i++;
        if (c === delimiter) break;
      }
    }
    while (/^[gpI0-9]$/.test(script[i] ?? "")) i++;
    while (script[i] === " ") i++;
    if (i === script.length) return true;
    if (script[i] !== ";") return false;
    i++;
  }
}

/** sed that only substitutes: -E, -n, -r and one script, given as -e or first; its files read as cat reads them. */
function sedRead(args, cwd) {
  let script;
  const files = [];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === "-e") {
      if (script !== undefined || k + 1 >= args.length) return false;
      script = args[++k];
    } else if (a.length > 1 && a.startsWith("-")) {
      if (!/^-[Enr]+$/.test(a)) return false;
    } else if (script === undefined) {
      script = a;
    } else {
      files.push(a);
    }
  }
  return script !== undefined && substitutesOnly(script) && files.every((f) => plainWord(f) && readable(f, cwd));
}

/** test or [ ]: one file or string check, so it reads whether a file is there and never what is in it. */
const FILE_CHECKS = new Set(["-f", "-d", "-e", "-s", "-r", "-x", "-n", "-z"]);
function fileCheck(words) {
  const operand = (w) => w.kind === "plain" && inFolder(w.value);
  if (words.length === 2) return words[0].kind === "plain" && FILE_CHECKS.has(words[0].value) && operand(words[1]);
  return words.length === 3 && operand(words[0]) && (words[1].value === "=" || (words[1].kind === "test" && words[1].value === "!=")) && operand(words[2]);
}

/** A command's name, as which and command -v look it up. */
const NAME = /^[A-Za-z0-9_][A-Za-z0-9._+-]*$/;

/** After lock-agent: a look at the kit's containers. */
function kitRead(words) {
  const at = words[0] === "docker" && words[1] === "compose" ? 2 : words[0] === "docker-compose" ? 1 : -1;
  return at > 0 && words[at] === "-f" && words[at + 1] === ".ifixai/compose.yaml" && ["ps", "logs"].includes(words[at + 2]);
}

/** After lock-agent: the kit's folders. */
function kitMkdir([name, flag, ...paths], cwd) {
  return name === "mkdir" && flag === "-p" && paths.length > 0 && paths.every((p) => !p.startsWith("-") && inKitFolder(p, cwd, true));
}

/** What a part that isn't a handed-out command is: "ours" (the kit's), "read", or null for anything else. */
function partKind(words, ctx) {
  const [first, ...rest] = words;
  if (first.kind === "test" && first.value === "[") {
    const last = rest.at(-1);
    return last?.kind === "test" && last.value === "]" && fileCheck(rest.slice(0, -1)) ? "read" : null;
  }
  if (first.kind !== "plain") return null;
  if (first.value === "test") return fileCheck(rest) ? "read" : null;
  // echo and printf read nothing: their words are only printed, `$?` and a judged `$( )` included
  if (first.value === "echo" || first.value === "printf") return rest.every((w) => w.kind !== "test") ? "read" : null;
  if (!rest.every((w) => w.kind === "plain")) return null;
  const values = words.map((w) => w.value);
  if (first.value === "which") return rest.length && values.slice(1).every((v) => NAME.test(v)) ? "read" : null;
  if (first.value === "command") return rest.length > 1 && values[1] === "-v" && values.slice(2).every((v) => NAME.test(v)) ? "read" : null;
  if (first.value === "sed") return sedRead(values.slice(1), ctx.cwd) ? "read" : null;
  if (ctx.locked && values.every(plainWord) && (kitRead(values) || kitMkdir(values, ctx.cwd))) return "ours";
  return plainRead(values, ctx.cwd) ? "read" : null;
}

/** The parts from `i`, each allowed: whether one is iFixAi's own, and where they end (inside a `$( )`, at its `)`).
 *  Null when any part isn't allowed. */
function judge(command, i, ctx, inner) {
  let ours = false;
  for (;;) {
    while (command[i] === " " || command[i] === "\t" || command[i] === "\n") i++;
    // nothing, or nothing after an operator
    if (atPartEnd(command, i, inner)) return null;
    const end = handedOutEnd(command, i, ctx.handed, inner);
    if (end >= 0) {
      ours = true;
      i = end;
    } else {
      const part = wordsOf(command, i, ctx, inner);
      const kind = part && part.words.length ? partKind(part.words, ctx) : null;
      if (!kind) return null;
      if (kind === "ours") ours = true;
      i = part.end;
    }
    if (inner ? command[i] === ")" : i >= command.length) return { ours, end: i };
    SEPARATOR.lastIndex = i;
    if (!SEPARATOR.test(command)) return null;
    i = SEPARATOR.lastIndex;
  }
}

/** Whether every part of the command is allowed and at least one is iFixAi's own. */
function allowed(command, session, cwd) {
  const handed = [...session.commands, ...(session.locked ? KIT_COMMANDS : [])].filter(Boolean).sort((a, b) => b.length - a.length);
  const parts = judge(command, 0, { handed, locked: session.locked, cwd }, false);
  return parts !== null && parts.ours && parts.end === command.length;
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
