import path from "node:path";
import { loadSourceLibrary } from "../config/source-library.js";
import { readJson, writeJson } from "../lib/files.js";
import {
  findMetricOutcomeBoldIssues,
  formatMetricOutcomeBoldIssues
} from "../lib/metric-outcome-bolding.js";
import {
  buildResumeBulletDistinctnessReport,
  formatResumeBulletDistinctnessIssues
} from "../lib/resume-bullet-distinctness.js";
import { generateDocxFiles } from "./docx.js";
import { generateLandingPage, generateResumeAndLetterHtml } from "./landing-page.js";
import { generatePdfs } from "./pdf.js";

export async function generatePackage(packageDir, options = {}) {
  await assertResumeBulletsDistinct(packageDir, options);
  await assertMetricOutcomesBoldable(packageDir, options);
  await generateLandingPage(packageDir, options);
  await generateResumeAndLetterHtml(packageDir, options);
  await generateDocxFiles(packageDir, options);
  if (!options.skipPdf) {
    await generatePdfs(packageDir);
  }
}

async function assertMetricOutcomesBoldable(packageDir, options = {}) {
  const [content, sourceLibrary] = await Promise.all([
    readJson(path.join(packageDir, "approved-content.json")),
    loadSourceLibrary(options.rootDir ?? process.cwd())
  ]);
  const issues = findMetricOutcomeBoldIssues(content, sourceLibrary);
  if (issues.length > 0) {
    throw new Error(
      `Metric outcome bolding failed before generation. ${formatMetricOutcomeBoldIssues(issues)}. Update approved metric phrases or source claims so only the measurable outcome phrase can be bolded.`
    );
  }
}

async function assertResumeBulletsDistinct(packageDir, options = {}) {
  const [content, sourceLibrary] = await Promise.all([
    readJson(path.join(packageDir, "approved-content.json")),
    loadSourceLibrary(options.rootDir ?? process.cwd())
  ]);
  const report = buildResumeBulletDistinctnessReport(content, sourceLibrary);
  await writeJson(path.join(packageDir, "bullet-distinctness-report.json"), report);
  if (!report.passed) {
    throw new Error(
      `Resume bullet distinctness failed before generation. ${formatResumeBulletDistinctnessIssues(report.issues)}. Fix source data or rerun analyze so each bullet under the same company serves a distinct purpose.`
    );
  }
}
