import fs from "node:fs/promises";
import path from "node:path";
import { pathExists, readJson, readYaml } from "./files.js";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref",
  "source",
  "utm",
  "wbraid"
]);

export async function findCachedJobPackages(outputRoot, criteria) {
  const root = path.resolve(outputRoot);
  if (!await pathExists(root)) return [];

  const targetUrl = canonicalJobUrl(criteria.jobUrl);
  const targetCompany = normalizeComparable(criteria.company);
  const targetRole = normalizeComparable(criteria.role);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const matches = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageDir = path.join(root, entry.name);
    const record = await readPackageCacheRecord(packageDir);
    if (!record) continue;

    const packageUrl = canonicalJobUrl(record.job_url);
    const urlMatches = targetUrl && packageUrl && targetUrl === packageUrl;
    const companyRoleMatches = targetCompany
      && targetRole
      && normalizeComparable(record.company) === targetCompany
      && normalizeComparable(record.role_title) === targetRole;

    if (!urlMatches && !companyRoleMatches) continue;
    matches.push({
      package_dir: packageDir,
      package_name: entry.name,
      company: record.company,
      role: record.role_title,
      public_url: record.public_url,
      job_url: record.job_url,
      created_on: record.created_on,
      match_type: urlMatches ? "job_url" : "company_role"
    });
  }

  matches.sort((a, b) => String(b.created_on ?? "").localeCompare(String(a.created_on ?? "")));
  return matches;
}

export function canonicalJobUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || TRACKING_PARAMS.has(lower)) {
        url.searchParams.delete(key);
      }
    }
    const sortedParams = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    url.search = "";
    for (const [key, val] of sortedParams) url.searchParams.append(key, val);
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return text.toLowerCase();
  }
}

export function renderCachedJobMessage(matches, jobUrl) {
  const lines = [
    "This job appears to already have a resume package.",
    "",
    `Job URL: ${jobUrl}`,
    "",
    "Existing package:"
  ];

  for (const match of matches) {
    lines.push(`- ${match.company || "Unknown company"}${match.role ? ` | ${match.role}` : ""}`);
    lines.push(`  Folder: ${match.package_dir}`);
    if (match.public_url) lines.push(`  Live URL: ${match.public_url}`);
    if (match.created_on) lines.push(`  Created: ${match.created_on}`);
    lines.push(`  Match: ${match.match_type === "job_url" ? "same job URL" : "same company and role"}`);
  }

  lines.push(
    "",
    "To reuse it, run:",
    `npm run resume-package -- status "${matches[0].package_dir}"`,
    "",
    "To create a new package anyway, re-run with:",
    `npm run resume-package -- run-url "${jobUrl}" --force-new`
  );

  return lines.join("\n");
}

async function readPackageCacheRecord(packageDir) {
  const input = await readOptionalYaml(path.join(packageDir, "input.yml"));
  const approved = await readOptionalJson(path.join(packageDir, "approved-content.json"));
  const intake = await readOptionalJson(path.join(packageDir, "url-intake.json"));
  const publishing = await readOptionalJson(path.join(packageDir, "publishing-status.json"));
  if (!input && !approved && !intake) return null;

  return {
    company: approved?.metadata?.company || input?.company || intake?.company || "",
    role_title: approved?.metadata?.role_title || input?.role_title || intake?.role || "",
    public_url: approved?.metadata?.public_url || publishing?.public_url || "",
    job_url: intake?.url || input?.job_url || extractJobUrlFromText(await readOptionalText(path.join(packageDir, "job-description.txt"))),
    created_on: input?.created_on || approved?.metadata?.generated_on || ""
  };
}

async function readOptionalJson(filePath) {
  try {
    if (!await pathExists(filePath)) return null;
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function readOptionalYaml(filePath) {
  try {
    if (!await pathExists(filePath)) return null;
    return await readYaml(filePath);
  } catch {
    return null;
  }
}

async function readOptionalText(filePath) {
  try {
    if (!await pathExists(filePath)) return "";
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function extractJobUrlFromText(text) {
  return String(text ?? "").match(/^Source URL:\s*(\S+)/m)?.[1] ?? "";
}

function normalizeComparable(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
