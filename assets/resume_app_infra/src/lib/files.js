import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

export async function writeText(filePath, text) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, text, "utf8");
}

export async function readYaml(filePath) {
  return YAML.parse(await readText(filePath));
}

export async function writeYaml(filePath, value) {
  await writeText(filePath, YAML.stringify(value));
}

export async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

export async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function resolvePackageDir(inputPath) {
  return path.resolve(inputPath);
}

export function repoPath(...segments) {
  return path.resolve(process.cwd(), ...segments);
}
