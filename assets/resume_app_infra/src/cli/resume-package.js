#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { Command } from "commander";
import { analyzePackage } from "../generators/analyze.js";
import { generatePackage } from "../generators/generate.js";
import { startPreviewServer } from "../preview/local-server.js";
import { publishWordPress, remoteRouteExists } from "../publishing/wordpress-sftp.js";
import { buildPackageSummary, renderCompletionMarkdown } from "../reporting/package-summary.js";
import { validatePackage } from "../validators/validate-package.js";
import { ensureDir, pathExists, readText, writeJson, writeText, writeYaml } from "../lib/files.js";
import { findCachedJobPackages, renderCachedJobMessage } from "../lib/job-cache.js";
import {
  assertDefaultOutputRoot,
  defaultOutputRoot,
  expandHome,
  resolvePackageDir
} from "../lib/package.js";
import { slugify, todayDisplayDate, uniqueValues } from "../lib/strings.js";
import { fetchJobPosting } from "../lib/url-intake.js";

const program = new Command();

program
  .name("resume-package")
  .description("Generate deterministic Stephanie Ramsay role packages from approved structured content.")
  .version("0.1.0");

program
  .command("run-url")
  .argument("<url>", "public job posting URL")
  .option("--company <company>", "override inferred company name")
  .option("--role <role>", "override inferred role title")
  .option("--output-root <path>", "folder that contains generated role package folders", defaultOutputRoot())
  .option("--allow-short-intake", "continue even when URL extraction looks incomplete")
  .option("--force-new", "create a new package even when this job appears to already exist")
  .option("--reuse-existing", "print the existing package status when this job appears to already exist")
  .option("--no-publish", "generate and validate only; skip WordPress publishing")
  .option("--host <host>", "SFTP host", "ssh.wp.com")
  .option("--username <username>", "SFTP username", "stephanieramsay.wordpress.com")
  .description("Create, generate, validate, publish, and summarize a role package from a job URL")
  .action(async (url, options) => {
    const summary = await runPackageFromUrl(url, options);
    console.log(renderCompletionMarkdown(summary));
  });

program
  .command("init")
  .argument("<slug>", "company or role package slug; used as the output folder name")
  .option("--company <company>", "company name", "")
  .option("--role <role>", "role title", "")
  .option("--output-root <path>", "folder that contains generated role package folders", defaultOutputRoot())
  .option("--job-description-file <path>", "copy job description from a text file")
  .description("Create ~/Dev/resume_packages/[slug]/input.yml and job-description.txt")
  .action(async (slugArg, options) => {
    const slug = slugify(slugArg);
    if (!slug) throw new Error("Slug cannot be empty.");
    const outputRoot = assertDefaultOutputRoot(options.outputRoot);
    const packageDir = path.resolve(outputRoot, slug);
    const jd = options.jobDescriptionFile ? await readText(path.resolve(options.jobDescriptionFile)) : "";
    await createPackageFiles(packageDir, {
      company: options.company,
      role: options.role,
      slug,
      jobDescription: jd || "Paste the full job description here.\n"
    });
    console.log(`Created package: ${packageDir}`);
  });

program
  .command("init-from-url")
  .argument("<url>", "public job posting URL")
  .option("--slug <slug>", "package slug; defaults to inferred company or host")
  .option("--company <company>", "override inferred company name")
  .option("--role <role>", "override inferred role title")
  .option("--output-root <path>", "folder that contains generated role package folders", defaultOutputRoot())
  .description("Fetch a public job posting URL and create ~/Dev/resume_packages/[slug]/")
  .action(async (url, options) => {
    const posting = await fetchJobPosting(url);
    assertUsablePosting(posting, { allowShortIntake: false });
    const company = options.company || posting.company || "";
    const role = options.role || posting.role || "";
    const outputRoot = assertDefaultOutputRoot(options.outputRoot);
    const slug = options.slug
      ? slugify(options.slug)
      : await uniquePackageName(outputRoot, slugify(company || posting.slug || role));
    if (!slug) throw new Error("Could not infer a package name. Re-run with --company or --role.");
    const packageDir = path.resolve(outputRoot, slug);
    await createPackageFiles(packageDir, {
      company,
      role,
      slug,
      jobDescription: posting.job_description,
      jobUrl: posting.url,
      notes: posting.extraction_warning
    });
    await writeJson(path.join(packageDir, "url-intake.json"), posting);
    console.log(`Created package: ${packageDir}`);
    console.log(`Inferred: ${company || "(company unknown)"} | ${role || "(role unknown)"}`);
    if (posting.extraction_warning) console.log(`Warning: ${posting.extraction_warning}`);
    console.log(`Review: ${path.join(packageDir, "job-description.txt")}`);
  });

program
  .command("analyze")
  .argument("<packageDir>", "role package directory")
  .description("Generate strategic-alignment.md, approved-content.json, and source-map.json")
  .action(async (packageDir) => {
    const resolvedDir = resolvePackageDir(packageDir);
    const result = await analyzePackage(resolvedDir);
    console.log(`Analyzed ${result.approvedContent.metadata.company} ${result.approvedContent.metadata.role_title}`);
    console.log(`Review: ${path.join(resolvedDir, "strategic-alignment.md")}`);
  });

program
  .command("generate")
  .argument("<packageDir>", "role package directory")
  .option("--skip-pdf", "generate HTML and DOCX only")
  .description("Generate deterministic HTML, DOCX, and PDF assets")
  .action(async (packageDir, options) => {
    const resolvedDir = resolvePackageDir(packageDir);
    await generatePackage(resolvedDir, { skipPdf: options.skipPdf });
    console.log(`Generated assets: ${resolvedDir}`);
  });

program
  .command("validate")
  .argument("<packageDir>", "role package directory")
  .option("--json", "print JSON result")
  .description("Validate generated role package and write verification-summary.md")
  .action(async (packageDir, options) => {
    const resolvedDir = resolvePackageDir(packageDir);
    const result = await validatePackage(resolvedDir);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.passed) process.exitCode = 1;
    } else {
      console.log(`Validation ${result.passed ? "PASS" : "FAIL"}`);
      const failed = result.checks.filter((check) => check.status !== "pass");
      for (const check of failed) console.log(`FAIL ${check.label}${check.detail ? ` (${check.detail})` : ""}`);
      console.log(`Wrote ${path.join(resolvedDir, "verification-summary.md")}`);
      if (!result.passed) process.exitCode = 1;
    }
  });

program
  .command("status")
  .argument("<packageDir>", "role package directory")
  .option("--json", "print JSON result")
  .description("Print the clean completion summary for a generated role package")
  .action(async (packageDir, options) => {
    const summary = await buildPackageSummary(resolvePackageDir(packageDir));
    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(renderCompletionMarkdown(summary));
    }
  });

program
  .command("preview")
  .argument("<packageDir>", "role package directory")
  .option("--port <port>", "local preview port", (value) => Number(value), 4321)
  .description("Serve a generated role package locally")
  .action(async (packageDir, options) => {
    const { url } = await startPreviewServer(resolvePackageDir(packageDir), { port: options.port });
    console.log(`Preview running at ${url}`);
    console.log("Press Ctrl+C to stop.");
  });

program
  .command("publish")
  .argument("<packageDir>", "role package directory")
  .option("--execute", "actually run SFTP upload; default is dry-run")
  .option("--json", "print full JSON publishing result")
  .option("--verbose", "print full JSON publishing result")
  .option("--host <host>", "SFTP host", "ssh.wp.com")
  .option("--username <username>", "SFTP username", "stephanieramsay.wordpress.com")
  .description("Dry-run or publish index.html to stephanieramsay.com/[slug]/")
  .action(async (packageDir, options) => {
    const resolvedDir = resolvePackageDir(packageDir);
    const result = await publishWordPress(resolvedDir, options);
    await writeJson(path.join(resolvedDir, "publishing-status.json"), result);
    if (options.json || options.verbose) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Publish ${result.status}: ${result.public_url}`);
      if (result.verified_live !== undefined) console.log(`Live verified: ${result.verified_live ? "yes" : "not verified"}`);
    }
  });

program
  .command("tidy")
  .argument("<packageDir>", "role package directory")
  .option("--dry-run", "show what would be removed without deleting")
  .description("Clean package-local temporary files while keeping generated assets inside ~/Dev/resume_packages/[package-folder]/")
  .action(async (packageDir, options) => {
    const resolvedDir = resolvePackageDir(packageDir);
    const tmpDir = path.join(resolvedDir, "tmp");
    const removed = await tidyPackage(resolvedDir, { dryRun: options.dryRun });
    console.log(`${options.dryRun ? "Would clean" : "Cleaned"} ${removed.length} temporary item(s) under ${tmpDir}`);
  });

program.parseAsync().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function runPackageFromUrl(url, options) {
  const outputRoot = assertDefaultOutputRoot(options.outputRoot);
  let duplicateApproved = false;
  const prefetchMatches = await findCachedJobPackages(outputRoot, { jobUrl: url });
  const prefetchDecision = await handleCachedJobPackages(prefetchMatches, url, options);
  if (prefetchDecision?.summary) return prefetchDecision.summary;
  duplicateApproved = prefetchDecision?.continue === true;

  const posting = await fetchJobPosting(url);
  const company = options.company || posting.company || "";
  const role = options.role || posting.role || "";
  assertUsablePosting(posting, options);

  if (!duplicateApproved) {
    const fetchedMatches = await findCachedJobPackages(outputRoot, {
      jobUrl: posting.url,
      company,
      role
    });
    const fetchedDecision = await handleCachedJobPackages(fetchedMatches, posting.url, options);
    if (fetchedDecision?.summary) return fetchedDecision.summary;
  }

  const baseName = slugify(company || posting.slug || role);
  const slug = await uniquePackageName(outputRoot, baseName, {
    checkRemote: options.publish,
    host: options.host,
    username: options.username,
    role
  });
  if (!slug) throw new Error("Could not infer a package name from the URL. Provide --company or --role.");

  const packageDir = path.resolve(outputRoot, slug);
  await createPackageFiles(packageDir, {
    company,
    role,
    slug,
    jobDescription: posting.job_description,
    jobUrl: posting.url,
    notes: posting.extraction_warning
  });
  await writeJson(path.join(packageDir, "url-intake.json"), posting);

  await analyzePackage(packageDir);
  await generatePackage(packageDir);
  const validation = await validatePackage(packageDir);
  if (!validation.passed) {
    const summary = await buildPackageSummary(packageDir);
    await writeJson(path.join(packageDir, "run-summary.json"), summary);
    throw new Error(`Package validation failed. See ${path.join(packageDir, "verification-summary.md")}`);
  }

  if (options.publish) {
    try {
      const publishResult = await publishWordPress(packageDir, {
        execute: true,
        host: options.host,
        username: options.username
      });
      await writeJson(path.join(packageDir, "publishing-status.json"), publishResult);
    } catch (error) {
      await writeJson(path.join(packageDir, "publishing-status.json"), {
        status: "publish-failed",
        message: error.message,
        public_url: `https://stephanieramsay.com/${slug}/`
      });
      const summary = await buildPackageSummary(packageDir);
      await writeJson(path.join(packageDir, "run-summary.json"), summary);
      throw error;
    }
  } else {
    await writeJson(path.join(packageDir, "publishing-status.json"), {
      status: "skipped",
      message: "Publishing skipped by --no-publish.",
      public_url: `https://stephanieramsay.com/${slug}/`
    });
  }

  const summary = await buildPackageSummary(packageDir);
  await writeJson(path.join(packageDir, "run-summary.json"), summary);
  return summary;
}

async function handleCachedJobPackages(matches, jobUrl, options) {
  if (!matches.length || options.forceNew) return { continue: Boolean(matches.length && options.forceNew) };

  if (options.reuseExisting) {
    return { summary: await buildPackageSummary(matches[0].package_dir) };
  }

  const message = renderCachedJobMessage(matches, jobUrl);
  if (input.isTTY && output.isTTY) {
    console.error(`\n${message}\n`);
    const rl = createInterface({ input, output });
    try {
      const answer = await rl.question("Create a new package anyway? [y/N] ");
      if (/^(y|yes)$/i.test(answer.trim())) return { continue: true };
      return { summary: await buildPackageSummary(matches[0].package_dir) };
    } finally {
      rl.close();
    }
  }

  throw new Error(`${message}\n\nStopped before creating or publishing anything.`);
}

function assertUsablePosting(posting, options = {}) {
  if (options.allowShortIntake) return;
  const blockedReason = blockedPageReason(posting);
  const warning = posting.extraction_warning || blockedReason;
  if (!warning) return;

  const inferred = [
    posting.company ? `company: ${posting.company}` : "",
    posting.role ? `role: ${posting.role}` : ""
  ].filter(Boolean).join(", ");
  const inferredText = inferred ? ` Inferred ${inferred}.` : "";
  throw new Error(`${warning} No package was created.${inferredText} Recover the full job description from a browser-readable source, then run init/analyze/generate/validate/publish manually. Re-run with --allow-short-intake only if the extracted content is complete.`);
}

function blockedPageReason(posting) {
  const text = [
    posting.title,
    posting.company,
    posting.role,
    posting.job_description
  ].join("\n").toLowerCase();
  const blockedSignals = [
    "just a moment",
    "performing security verification",
    "protect against malicious bots",
    "not a bot",
    "cloudflare"
  ];
  return blockedSignals.some((signal) => text.includes(signal))
    ? "The fetched page appears to be a bot-check or security verification page, not the job posting."
    : "";
}

async function uniquePackageName(outputRoot, baseName, options = {}) {
  const base = slugify(baseName);
  if (!base) return "";
  const fallbackBase = options.role ? slugify(`${base}-${options.role}`) : "";
  const candidates = uniqueValues([base, fallbackBase].filter(Boolean));
  let candidate = candidates.shift();
  let counter = 2;
  while (candidate && await packageNameUnavailable(outputRoot, candidate, options)) {
    candidate = candidates.shift() || `${fallbackBase || base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

async function packageNameUnavailable(outputRoot, candidate, options) {
  if (await pathExists(path.join(outputRoot, candidate))) return true;
  if (!options.checkRemote) return false;
  try {
    return await remoteRouteExists(candidate, options);
  } catch {
    return false;
  }
}

async function createPackageFiles(packageDir, data) {
  await ensureDir(packageDir);
  const inputPath = path.join(packageDir, "input.yml");
  const jdPath = path.join(packageDir, "job-description.txt");

  if (!await pathExists(inputPath)) {
    await writeYaml(inputPath, {
      company: data.company,
      role_title: data.role,
      slug: data.slug,
      target_role_label: data.company && data.role ? `${data.role}, ${data.company}` : "",
      department: "",
      company_location: "",
      hiring_team: data.company ? `${data.company} Team` : "",
      company_motivation: "",
      notes: data.notes || "",
      job_url: data.jobUrl || "",
      publish: false,
      created_on: todayDisplayDate()
    });
  }

  if (!await pathExists(jdPath)) {
    await writeText(jdPath, data.jobDescription || "Paste the full job description here.\n");
  }
}

async function tidyPackage(packageDir, options = {}) {
  const tmpDir = path.join(packageDir, "tmp");
  if (!await pathExists(tmpDir)) return [];
  const entries = await fs.readdir(tmpDir);
  const removed = entries.map((entry) => path.join(tmpDir, entry));
  if (!options.dryRun) {
    await Promise.all(removed.map((entry) => fs.rm(entry, { recursive: true, force: true })));
  }
  return removed;
}
