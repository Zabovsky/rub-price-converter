import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "public");
const outDir = process.env.BROWSER === "firefox" ? "dist-firefox" : "dist";
const target = join(root, outDir, "public");

if (!existsSync(source)) {
  console.log("No public directory to copy.");
  process.exit(0);
}

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log(`Copied public/ to ${outDir}/public/`);
