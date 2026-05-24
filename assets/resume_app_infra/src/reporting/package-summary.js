import path from "node:path";
import { pathExists, readJson, readText } from "../lib/files.js";
import { packagePaths } from "../lib/package.js";

export async function buildPackageSummary(packageDir) {
  const resolvedDir = path.resolve(packageDir);
  const content = await readJson(path.join(resolvedDir, "approved-content.json"));
  const paths = packagePaths(resolvedDir, content);
  const assets = [
    ["Website HTML", paths.indexHtml],
    ["Website PDF", paths.websitePdf],
    ["Resume DOCX", paths.atsDocx],
    ["Resume PDF", paths.atsPdf],
    ["Cover Letter DOCX", paths.coverDocx],
    ["Cover Letter PDF", paths.coverPdf]
  ];

  const assetRows = [];
  for (const [label, filePath] of assets) {
    assetRows.push({ label, path: filePath, exists: await pathExists(filePath) });
  }

  const verificationPath = path.join(resolvedDir, "verification-summary.md");
  const verificationText = await readOptionalText(verificationPath);
  const publishingPath = path.join(resolvedDir, "publishing-status.json");
  const atsReportPath = path.join(resolvedDir, "ats-parse-report.json");
  const intakePath = path.join(resolvedDir, "url-intake.json");

  return {
    package_dir: resolvedDir,
    company: content.metadata.company,
    role: content.metadata.role_title,
    public_url: content.metadata.public_url,
    generated_on: content.metadata.generated_on,
    assets: assetRows,
    validation: {
      summary_path: verificationPath,
      passed: /^Status:\s+PASS$/m.test(verificationText),
      failed: /^Status:\s+FAIL$/m.test(verificationText)
    },
    publishing: await readOptionalJson(publishingPath),
    ats_report: await readOptionalJson(atsReportPath),
    intake: await readOptionalJson(intakePath)
  };
}

export function renderCompletionMarkdown(summary) {
  const generated = summary.assets.every((asset) => asset.exists);
  const published = summary.publishing?.status === "published";
  const verified = summary.publishing?.verified_live === true;
  const keywordCoverage = summary.ats_report?.keyword_coverage;
  const keywordLine = keywordCoverage
    ? `${Math.round(keywordCoverage.ratio * 100)}% (${keywordCoverage.covered.length}/${keywordCoverage.total})`
    : "not measured";

  const lines = [
    "```text",
    "============================================================",
    " RESUME PACKAGE COMPLETE",
    "============================================================",
    "```",
    "",
    `Company: ${summary.company}`,
    `Role: ${summary.role}`,
    "",
    `Generated: ${generated ? "yes" : "missing files"}`,
    `Validated: ${summary.validation.passed ? "PASS" : "FAIL"}`,
    `Published: ${published ? "yes" : summary.publishing?.status ?? "not published"}`,
    `Live verified: ${verified ? "yes" : "not verified"}`,
    `ATS keyword coverage: ${keywordLine}`,
    "",
    `Live URL: ${summary.public_url}`,
    `Package folder: ${summary.package_dir}`,
    "",
    "Files:",
    ...summary.assets.map((asset) => `- ${asset.exists ? "[x]" : "[ ]"} ${asset.label}: ${asset.path}`)
  ];

  if (summary.intake?.extraction_warning) {
    lines.push("", `Intake warning: ${summary.intake.extraction_warning}`);
  }

  if (summary.publishing?.remote) {
    lines.push("", `WordPress remote: ${summary.publishing.remote}`);
  }

  return `${lines.join("\n")}\n`;
}

async function readOptionalJson(filePath) {
  try {
    if (!await pathExists(filePath)) return null;
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function readOptionalText(filePath) {
  try {
    if (!await pathExists(filePath)) return "";
    return await readText(filePath);
  } catch {
    return "";
  }
}
