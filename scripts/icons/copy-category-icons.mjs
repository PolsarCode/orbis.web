import { cpSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const web = path.join(import.meta.dirname, "..", "..");
const source = path.join(web, "node_modules", "lucide-static");
const target = path.join(web, "public", "category-icons");

rmSync(target, { recursive: true, force: true });
cpSync(path.join(source, "icons"), target, { recursive: true });

const tags = JSON.parse(readFileSync(path.join(source, "tags.json"), "utf8"));
const icons = readdirSync(target)
  .filter((file) => file.endsWith(".svg"))
  .map((file) => file.slice(0, -".svg".length))
  .sort();
writeFileSync(
  path.join(target, "index.json"),
  JSON.stringify(icons.map((name) => [name, ...(tags[name] ?? [])])),
);
console.log(`🎨 Copied ${icons.length} category icons to public/category-icons`);
