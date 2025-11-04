import fs from "node:fs/promises";
import path from "node:path";
import { globby } from "globby";

const DOCS_DIR = "src/content/docs";
const ASSETS_PREFIX = "/notion-assets"; // we put assets in /public/notion-assets

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const files = await globby(`${DOCS_DIR}/**/*.md`);

for (const file of files) {
  let txt = await fs.readFile(file, "utf8");

  // [text](./Some Page.md) or (../Folder/Some Page.md) -> (/docs/some-page/)
  txt = txt.replace(/\((?:\.{1,2}\/)*([^)\n]+?)\.md\)/g, (_m, p) => {
    const base = slugify(path.basename(p));
    return `(/docs/${base}/)`;
  });

  // Images from exported "assets" → /notion-assets/<file>
  // catches .../assets/filename.png
  txt = txt.replace(
    /\((?:\.{1,2}\/)*[^)\n]*assets\/([^)\n]+)\)/g,
    (_m, fname) => {
      return `(${ASSETS_PREFIX}/${fname})`;
    },
  );

  // Optional: convert “Toggle” style headings to <details>
  // (Skip if you didn't use toggles.)
  // Example Notion export pattern varies, so leave this off by default.

  await fs.writeFile(file, txt);
}

console.log("✓ Notion links & images normalized.");
