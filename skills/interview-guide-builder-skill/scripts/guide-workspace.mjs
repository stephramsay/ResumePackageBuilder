#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT_ROOT = "/Users/stephanie/Dev/Interview Guide";
const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_PATH = path.join(SKILL_DIR, "assets", "interview-guide-template.md");
const FRAMEWORK_BANK_PATH = path.join(SKILL_DIR, "assets", "framework-bank.md");
const DEFAULT_SCRIPT_MAX_WORDS = 100;
const EXTENDED_SCRIPT_MAX_WORDS = 130;
const ANSWER_TYPES = new Set([
  "POSITIONING",
  "FRAMEWORK_WITH_PROOF",
  "BEHAVIORAL_STORY",
  "PRODUCT_DIAGNOSIS",
  "PLAN",
  "QUESTIONS_OR_CLOSE"
]);
const STANDARD_ROUTER_COVERAGE = [
  {
    label: "tell me about yourself / background",
    patterns: [/\bTELL_ME_ABOUT_YOURSELF\b/i, /\btell me about yourself\b/i, /\bwalk me through your background\b/i, /\bcareer story\b/i]
  },
  {
    label: "why this company",
    patterns: [/\bWHY_(?!THIS_ROLE|THIS_ROLE_NOW)[A-Z0-9_]+\b/i, /\bwhy this company\b/i, /\bwhy are you interested\b/i, /\bwhy do you want to work here\b/i, /\bcompany fit\b/i, /\bmission fit\b/i]
  },
  {
    label: "why this role / role fit",
    patterns: [/\bWHY_THIS_ROLE\b/i, /\bWHY_THIS_ROLE_NOW\b/i, /\bwhy this role\b/i, /\brole fit\b/i, /\bwhy should we hire you\b/i, /\bstrong fit\b/i]
  },
  {
    label: "first 30/60/90 or getting started",
    patterns: [/\bfirst 30\b/i, /\b30\/60\/90\b/i, /\bfirst 60\b/i, /\bfirst 90\b/i, /\bfirst .* days\b/i, /\bgetting started\b/i]
  },
  {
    label: "prioritization / roadmap",
    patterns: [/\bPRIORITI[ZS]ATION\b/i, /\bprioriti[sz]e\b/i, /\broadmap\b/i, /\bcompeting bets\b/i, /\bsequencing\b/i]
  },
  {
    label: "stakeholder pushback",
    patterns: [/\bSTAKEHOLDER_PUSHBACK\b/i, /\bpush back\b/i, /\bstakeholder request\b/i, /\bnot aligned with product strategy\b/i, /\bprovider portal\b/i, /\bone-off client request\b/i, /\bsales request\b/i]
  },
  {
    label: "requirements / launch readiness",
    patterns: [/\brequirements\b/i, /\bacceptance criteria\b/i, /\blaunch readiness\b/i, /\bwrite a spec\b/i, /\bdefine done\b/i, /\btechnical specifications\b/i]
  },
  {
    label: "metrics / measuring success",
    patterns: [/\bmetrics\b/i, /\bmeasure success\b/i, /\bsuccess metrics\b/i, /\bimpact metrics\b/i, /\boutcomes\b/i]
  },
  {
    label: "cross-functional alignment or conflict",
    patterns: [/\bcross[- ]functional\b/i, /\balignment\b/i, /\bconflict\b/i, /\bdisagreement\b/i, /\binfluence without authority\b/i, /\bunclear owner\b/i]
  },
  {
    label: "failure / mistake / learning",
    patterns: [/\bfailure\b/i, /\bfailed\b/i, /\bmistake\b/i, /\bwrong\b/i, /\blesson learned\b/i, /\bdid not work as expected\b/i]
  },
  {
    label: "ambiguity / incomplete information",
    patterns: [/\bambiguity\b/i, /\bambiguous\b/i, /\bno playbook\b/i, /\bincomplete data\b/i, /\bunclear problem\b/i]
  },
  {
    label: "leadership style or leadership influence",
    patterns: [/\bleadership style\b/i, /\bpeople describe\b/i, /\bleadership influence\b/i, /\binfluencing leadership\b/i, /\bmentor(?:ing)?\b/i]
  },
  {
    label: "questions for them",
    patterns: [/\bQUESTIONS_FOR_THEM\b/i, /\bquestions for (?:them|us|interviewer)/i, /\bquestions do you have\b/i, /\bwhat would you ask\b/i]
  },
  {
    label: "closing / final thoughts",
    patterns: [/\bCLOS(?:E|ING)\b/i, /\bfinal thoughts\b/i, /\banything else\b/i, /\bwhy should we hire you\b/i, /\bmove forward\b/i]
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  if (!command || command === "--help" || command === "-h" || options.help) return printHelp();
  if (command === "init") return initWorkspace(options);
  if (command === "validate-router") return validateRouter(options);
  throw new Error(`Unknown command: ${command}`);
}

async function initWorkspace(options) {
  const company = clean(options.company);
  const role = clean(options.role);
  if (!company || !role) throw new Error("init requires --company and --role.");
  const outputRoot = resolveHome(options.outputRoot || DEFAULT_OUTPUT_ROOT);
  const folder = path.join(outputRoot, folderName(company, role, options.folderName));
  await fs.mkdir(folder, { recursive: true });

  const jdPath = path.join(folder, "job-description.md");
  const researchPath = path.join(folder, "company-research.md");
  const fitMapPath = path.join(folder, "story-fit-map.md");
  const guidePath = path.join(folder, "interview-guide.md");

  await writeIfMissing(jdPath, await renderJobDescription(options, { company, role }));
  await writeIfMissing(researchPath, `# ${company} Research\n\nGenerated: ${new Date().toISOString().slice(0, 10)}\n\n## Known Facts\n\n## Interview Implications\n\n## Risks Or Watchouts\n\n## Questions To Ask Them\n`);
  await writeIfMissing(fitMapPath, `# ${company} ${role} Story Fit Map\n\n## Story Fit\n\n| Role Need | Primary Story | Backup Stories | Angle | Approved Metrics | Framework Cue | Notes |\n| --- | --- | --- | --- | --- | --- | --- |\n\n## Frameworks To Keep Returning To\n\nSelect 5-8 framework IDs from:\n\n${FRAMEWORK_BANK_PATH}\n\n| Situation | Framework ID | Why It Matters For This Role | Stephanie Cue |\n| --- | --- | --- | --- |\n`);
  await writeIfMissing(guidePath, (await fs.readFile(TEMPLATE_PATH, "utf8"))
    .replaceAll("[Company]", company)
    .replaceAll("[Role]", role)
    .replaceAll("[date]", new Date().toISOString().slice(0, 10)));

  console.log(`Created role workspace: ${folder}`);
  console.log(`Guide: ${guidePath}`);
}

async function validateRouter(options) {
  if (!options.guide) throw new Error("validate-router requires --guide.");
  const guidePath = resolveHome(options.guide);
  const text = await fs.readFile(guidePath, "utf8");
  const section = extractRouterSection(text);
  const routeCount = (section.match(/^### ROUTE\s+(?!INDEX\b)/gm) || []).length;
  const missing = [];
  for (const field of ["ROUTE:", "SECTION:", "QUESTION:", "ANSWER TYPE:", "TRIGGERS:", "PRIMARY STORY:", "BACKUP STORIES:", "SCRIPT:", "CUES:", "SOURCE FACTS:"]) {
    if (!section.includes(field)) missing.push(field);
  }
  if (!routeCount) missing.push("at least one ### ROUTE block");
  if (missing.length) {
    console.error(`Router validation failed for ${guidePath}`);
    for (const item of missing) console.error(`- Missing ${item}`);
    process.exitCode = 1;
    return;
  }
  const unknownFrameworks = await findUnknownFrameworkIds(section);
  if (unknownFrameworks.length) {
    console.error(`Router validation failed for ${guidePath}`);
    console.error("Unknown framework ID(s):");
    for (const id of unknownFrameworks) console.error(`- ${id}`);
    process.exitCode = 1;
    return;
  }
  const pushbackErrors = validateStakeholderPushbackMapping(section);
  if (pushbackErrors.length) {
    console.error(`Router validation failed for ${guidePath}`);
    for (const item of pushbackErrors) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }
  const coverageErrors = validateStandardCoverage(section);
  if (coverageErrors.length) {
    console.error(`Router validation failed for ${guidePath}`);
    for (const item of coverageErrors) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }
  const lengthErrors = validateScriptLengths(section);
  if (lengthErrors.length) {
    console.error(`Router validation failed for ${guidePath}`);
    for (const item of lengthErrors) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }
  const answerTypeErrors = validateAnswerTypes(section);
  if (answerTypeErrors.length) {
    console.error(`Router validation failed for ${guidePath}`);
    for (const item of answerTypeErrors) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Router validation passed: ${routeCount} route block(s)`);
}

function validateStandardCoverage(section) {
  const blocks = routeBlocks(section);
  return STANDARD_ROUTER_COVERAGE
    .filter((category) => !blocks.some((block) => category.patterns.some((pattern) => pattern.test(block))))
    .map((category) => `Missing standard interview coverage route: ${category.label}.`);
}

function validateScriptLengths(section) {
  const errors = [];
  for (const block of routeBlocks(section)) {
    const header = clean(block.split(/\r?\n/)[0] || "Route");
    const script = extractRouteField(block, "SCRIPT");
    if (!script) continue;
    const count = wordCount(script);
    const exception = scriptLengthException(block);
    if (count > DEFAULT_SCRIPT_MAX_WORDS && !exception) {
      errors.push(`${header} SCRIPT is ${count} words; default max is ${DEFAULT_SCRIPT_MAX_WORDS}. Move depth into CUES/SOURCE FACTS for follow-up.`);
    } else if (count > EXTENDED_SCRIPT_MAX_WORDS) {
      errors.push(`${header} SCRIPT is ${count} words; even length-exception scripts max out at ${EXTENDED_SCRIPT_MAX_WORDS}.`);
    }
  }
  return errors;
}

function validateAnswerTypes(section) {
  const errors = [];
  for (const block of routeBlocks(section)) {
    const header = clean(block.split(/\r?\n/)[0] || "Route");
    const answerType = extractRouteField(block, "ANSWER TYPE").toUpperCase();
    if (!answerType) {
      errors.push(`${header} is missing ANSWER TYPE.`);
    } else if (!ANSWER_TYPES.has(answerType)) {
      errors.push(`${header} has unknown ANSWER TYPE '${answerType}'. Use one of: ${[...ANSWER_TYPES].join(", ")}.`);
    }
  }
  return errors;
}

function validateStakeholderPushbackMapping(section) {
  const errors = [];
  const blocks = routeBlocks(section);
  for (const block of blocks) {
    const [headerLine = "", ...rest] = block.split(/\r?\n/);
    const header = clean(headerLine);
    const body = rest.join("\n");
    const haystack = `${header}\n${body}`.toLowerCase();
    const isPushbackRoute = /stakeholder_pushback|stakeholder request|not aligned with product strategy|provider portal|one-off client request|sales request/.test(haystack);
    if (!isPushbackRoute) continue;
    const primary = /^PRIMARY STORY:\s*(.+)$/im.exec(body)?.[1] || "";
    if (!/\bSTORY_03_HEALTH_SUMMARY_REPORT\b/.test(primary)) {
      errors.push(`${header} looks like stakeholder-pushback/provider-portal routing but PRIMARY STORY is not STORY_03_HEALTH_SUMMARY_REPORT.`);
    }
  }
  return errors;
}

function routeBlocks(section) {
  return section.split(/^### ROUTE\s+(?!INDEX\b)/gm).slice(1);
}

function extractRouteField(block, fieldName) {
  const pattern = new RegExp(`^${escapeRegex(fieldName)}:\\s*(.*)$`, "im");
  const match = pattern.exec(block);
  if (!match) return "";
  const rest = block.slice(match.index + match[0].length);
  const next = /^(ROUTE|SECTION|QUESTION|ANSWER TYPE|TRIGGERS|PRIMARY STORY|PRIMARY STORIES|BACKUP STORIES|SCRIPT|CUES|SOURCE FACTS):/im.exec(rest);
  return clean([match[1], next ? rest.slice(0, next.index) : rest].filter(Boolean).join("\n"));
}

function scriptLengthException(block) {
  if (/\bSCRIPT LENGTH EXCEPTION:\s*CORE_NARRATIVE\b/i.test(block)) return "CORE_NARRATIVE";
  if (/\bSCRIPT LENGTH EXCEPTION:\s*FUNDAMENTAL_STORY\b/i.test(block)) return "FUNDAMENTAL_STORY";
  if (/\bTELL_ME_ABOUT_YOURSELF\b/i.test(block) || /\bCore Narrative\b/i.test(block)) return "CORE_NARRATIVE";
  return "";
}

function wordCount(text) {
  return clean(text).split(/\s+/).filter(Boolean).length;
}

function escapeRegex(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findUnknownFrameworkIds(text) {
  const used = [...new Set(text.match(/\bFW_[A-Z0-9_]+\b/g) || [])].filter((id) => id !== "FW_XXXX");
  if (!used.length) return [];
  let bank = "";
  try {
    bank = await fs.readFile(FRAMEWORK_BANK_PATH, "utf8");
  } catch {
    return used;
  }
  const known = new Set(bank.match(/\bFW_[A-Z0-9_]+\b/g) || []);
  return used.filter((id) => !known.has(id));
}

async function renderJobDescription(options, target) {
  if (!options.jobDescription) {
    return `# ${target.company} ${target.role} Job Description\n\nSource: [paste or attach JD]\n`;
  }
  const sourcePath = resolveHome(options.jobDescription);
  const ext = path.extname(sourcePath).toLowerCase();
  let body = "";
  if ([".md", ".txt", ".json", ".html", ".htm"].includes(ext)) {
    body = await fs.readFile(sourcePath, "utf8");
  } else {
    body = `Binary or rich document source retained for extraction by Codex: ${sourcePath}\n`;
  }
  return `# ${target.company} ${target.role} Job Description\n\nSource: ${sourcePath}\n\n${body.trim()}\n`;
}

function extractRouterSection(text) {
  const marker = /^## Cluely Router Source\s*$/m.exec(text);
  if (!marker) throw new Error("Missing ## Cluely Router Source section.");
  const rest = text.slice(marker.index + marker[0].length);
  const next = /^##\s+(?!Cluely Router Source\b).+$/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

async function writeIfMissing(filePath, content) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content, "utf8");
  }
}

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--")) {
      const key = camelCase(arg.slice(2));
      const next = args[i + 1];
      if (!next || next.startsWith("--")) options[key] = true;
      else {
        options[key] = next;
        i += 1;
      }
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  guide-workspace.mjs init --company "Company" --role "Role Title" [--job-description /path/to/jd] [--folder-name "Company - Role"]
  guide-workspace.mjs validate-router --guide /path/to/interview-guide.md`);
}

function resolveHome(value) {
  const text = String(value || "");
  if (text === "~") return os.homedir();
  if (text.startsWith("~/")) return path.join(os.homedir(), text.slice(2));
  return path.resolve(text);
}

function folderName(company, role, override) {
  const raw = clean(override || `${company} - ${role}`);
  const safe = raw
    .replace(/[/:*?"<>|\\]+/g, "-")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
  return safe.slice(0, 120) || "Interview Guide";
}

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function camelCase(text) {
  return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
