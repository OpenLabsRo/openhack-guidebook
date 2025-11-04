#!/usr/bin/env node

/**
 * Normalizes Markdown files exported from Notion so they align with the Astro Starlight docs schema.
 * - Ensures frontmatter with a `title` derived from the first heading (or filename).
 * - Normalizes internal doc links to match collection slugs and strips Notion hash suffixes.
 * - Replaces common Notion artifacts such as encoded hyphen sequences and non-breaking spaces.
 *
 * Run with:
 *   node scripts/fix-notion-markdown.mjs
 * Optional flags:
 *   --check    Report files that would be changed without writing them.
 */

import { dirname, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { globby } from "globby";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const docsDir = resolve(repoRoot, "src", "content", "docs");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--check") || args.has("--dry-run");

const docFiles = await globby("**/*.md", { cwd: docsDir, absolute: true });
if (docFiles.length === 0) {
  console.warn("No Markdown files found under src/content/docs.");
  process.exit(0);
}

const knownSlugs = new Set(
  docFiles.map((file) => basename(file, ".md").toLowerCase()),
);

let updatedCount = 0;
const changedFiles = [];

for (const absolutePath of docFiles) {
  const original = await readFile(absolutePath, "utf8");
  const normalizedEol = original.replace(/\r\n/g, "\n");

  const processed = processDocument(normalizedEol, absolutePath);
  if (processed === normalizedEol) continue;

  changedFiles.push(relative(repoRoot, absolutePath));
  updatedCount++;

  if (!dryRun) {
    await writeFile(absolutePath, processed, "utf8");
  }
}

if (updatedCount === 0) {
  console.log("All Markdown files already match the expected formatting.");
  process.exit(0);
}

const prefix = dryRun ? "[CHECK]" : "[WRITE]";
console.log(
  `${prefix} Updated ${updatedCount} Markdown file${updatedCount === 1 ? "" : "s"}:`,
);
for (const file of changedFiles) {
  console.log(`  - ${file}`);
}

if (dryRun) {
  console.log("Re-run without --check to apply these changes.");
}

function processDocument(content, filePath) {
  let { frontmatter, body } = splitFrontmatter(content);
  const originalBody = body;

  body = normalizeBody(body, filePath);

  const title = deriveTitle(body, filePath);
  const updatedFrontmatter = ensureTitleInFrontmatter(frontmatter, title);

  const rebuilt = rebuildDocument(updatedFrontmatter, body);
  return rebuilt;
}

function splitFrontmatter(content) {
  if (!content.startsWith("---")) {
    return { frontmatter: null, body: content };
  }

  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: null, body: content };
  }

  const frontmatter = match[1];
  const body = content.slice(match[0].length);
  return { frontmatter, body };
}

function normalizeBody(body, filePath) {
  let updated = body;

  // Replace non-breaking spaces which are common in Notion exports.
  updated = updated.replace(/\u00a0/g, " ");

  // Normalize internal links that point to docs pages.
  updated = updated.replace(/\]\((\/[^)\s]+)\)/g, (match, path) => {
    const cleaned = normalizeDocsLink(path);
    return cleaned === path ? match : match.replace(path, cleaned);
  });

  // Ensure the body doesn't start with excessive blank lines.
  updated = updated.replace(/^\s*\n/, "");

  return updated;
}

function normalizeDocsLink(path) {
  if (!path.startsWith("/")) return path;

  let base = path;
  let hash = "";
  let query = "";

  const hashIndex = base.indexOf("#");
  if (hashIndex !== -1) {
    hash = base.slice(hashIndex);
    base = base.slice(0, hashIndex);
  }

  const queryIndex = base.indexOf("?");
  if (queryIndex !== -1) {
    query = base.slice(queryIndex);
    base = base.slice(0, queryIndex);
  }

  const trailingSlash = base.endsWith("/");
  const segments = base.split("/").filter(Boolean);

  if (segments.length === 0) return path;

  const normalizedSegments = segments.map((segment, index) => {
    return normalizeSlugSegment(segment);
  });

  let normalizedPath = "/" + normalizedSegments.join("/");
  if (trailingSlash && normalizedPath !== "/") {
    normalizedPath += "/";
  }

  return normalizedPath + query + hash;
}

function normalizeSlugSegment(segment) {
  if (!segment) return segment;

  const candidates = new Set();
  const lower = segment.toLowerCase();

  candidates.add(lower);
  candidates.add(lower.replace(/-[0-9a-f]{16,}$/i, ""));

  const decoded = decodeEncodedHyphens(lower);
  candidates.add(decoded);
  candidates.add(decoded.replace(/-[0-9a-f]{16,}$/i, ""));

  const slugified = slugify(decoded);
  candidates.add(slugified);

  const withoutStopWords = stripCommonStopWords(slugified);
  if (withoutStopWords) {
    candidates.add(withoutStopWords);
  }

  for (const candidate of candidates) {
    if (candidate && knownSlugs.has(candidate)) {
      return candidate;
    }
  }

  return slugified || lower;
}

function decodeEncodedHyphens(value) {
  return value.replace(/-([0-9a-f]{2})/gi, (_, hex) => {
    const charCode = parseInt(hex, 16);
    if (Number.isNaN(charCode)) return "-";
    const asChar = String.fromCharCode(charCode);
    return asChar === " " ? "-" : asChar;
  });
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function stripCommonStopWords(slug) {
  if (!slug) return slug;
  const stopWords = new Set(["and", "the", "a", "an", "of"]);
  const parts = slug
    .split("-")
    .filter(Boolean)
    .filter((part) => !stopWords.has(part));
  return parts.join("-");
}

function deriveTitle(body, filePath) {
  const match = body.match(/^#\s+(.+)$/m);
  if (match) {
    const heading = sanitizeHeading(match[1]);
    if (heading) return heading;
  }

  const filename = basename(filePath, ".md");
  return toTitleCase(filename.replace(/[-_]+/g, " "));
}

function sanitizeHeading(text) {
  return text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
    .trim();
}

function toTitleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function ensureTitleInFrontmatter(frontmatter, title) {
  const escapedTitle = escapeYamlString(title);

  if (frontmatter === null) {
    return `title: "${escapedTitle}"`;
  }

  if (/^title\s*:/m.test(frontmatter)) {
    return frontmatter;
  }

  const lines = frontmatter.split(/\r?\n/);
  lines.unshift(`title: "${escapedTitle}"`);
  return lines.join("\n");
}

function escapeYamlString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function rebuildDocument(frontmatter, body) {
  const fmBlock = `---\n${frontmatter.trimEnd()}\n---`;
  const cleanedBody = body.replace(/^\s*/, "");
  return `${fmBlock}\n\n${cleanedBody}`;
}
