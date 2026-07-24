import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".wrangler",
  ".wrangler-config",
  "broadcast",
  "cache",
  "coverage",
  "dist",
  "lib",
  "node_modules",
  "out",
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(absolute);
    }
  }

  return files;
}

function withoutCodeFences(markdown) {
  return markdown.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, "");
}

function githubSlug(value) {
  return value
    .replace(/!??\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s\-_]/gu, "")
    .replace(/\s+/g, "-");
}

function headingSlugs(markdown) {
  const slugs = new Set();
  const counts = new Map();

  for (const line of withoutCodeFences(markdown).split(/\r?\n/)) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const base = githubSlug(match[1]);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }

  return slugs;
}

function lineNumberAt(markdown, index) {
  return markdown.slice(0, index).split(/\r?\n/).length;
}

function markdownTargets(markdown) {
  const targets = [];
  const content = withoutCodeFences(markdown);
  const pattern = /!?\[[^\]]*\]\(([^)\r\n]+)\)/g;

  for (const match of content.matchAll(pattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    } else {
      target = target.split(/\s+["']/)[0];
    }
    targets.push({ line: lineNumberAt(content, match.index), target });
  }

  return targets;
}

async function hasExactPathCase(absolutePath) {
  const relative = path.relative(root, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  let current = root;

  for (const segment of relative.split(path.sep).filter(Boolean)) {
    const names = await readdir(current);
    if (!names.includes(segment)) return false;
    current = path.join(current, segment);
  }

  return true;
}

const markdownFiles = await walk(root);
const markdownCache = new Map();
const errors = [];
let checkedLinks = 0;

for (const file of markdownFiles) {
  const markdown = await readFile(file, "utf8");
  markdownCache.set(file, markdown);

  for (const { line, target } of markdownTargets(markdown)) {
    if (
      !target ||
      /^(?:https?:|mailto:|tel:|data:|ipfs:|ar:)/i.test(target)
    ) {
      continue;
    }
    checkedLinks += 1;

    const [rawPath, rawAnchor = ""] = target.split("#", 2);
    const targetPath = rawPath.split("?")[0];
    let decodedPath;
    let decodedAnchor;

    try {
      decodedPath = decodeURIComponent(targetPath);
      decodedAnchor = decodeURIComponent(rawAnchor).toLocaleLowerCase("en-US");
    } catch {
      errors.push(`${path.relative(root, file)}:${line} has invalid URL encoding: ${target}`);
      continue;
    }

    const resolved = decodedPath
      ? path.resolve(path.dirname(file), decodedPath)
      : file;

    let targetStat;
    try {
      targetStat = await stat(resolved);
      if (!(await hasExactPathCase(resolved))) {
        throw new Error("not an exact-case file");
      }
    } catch {
      errors.push(`${path.relative(root, file)}:${line} missing local target: ${target}`);
      continue;
    }

    if (
      decodedAnchor &&
      targetStat.isFile() &&
      resolved.toLowerCase().endsWith(".md")
    ) {
      const targetMarkdown =
        markdownCache.get(resolved) ?? (await readFile(resolved, "utf8"));
      markdownCache.set(resolved, targetMarkdown);
      if (!headingSlugs(targetMarkdown).has(decodedAnchor)) {
        errors.push(`${path.relative(root, file)}:${line} missing heading: ${target}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Markdown link check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Markdown link check passed: ${markdownFiles.length} files, ${checkedLinks} local links.`,
  );
}
