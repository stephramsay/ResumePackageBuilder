#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DEFAULT_TEST_QUESTIONS = [
  ["TELL_ME_ABOUT_YOURSELF_01", "Tell me about yourself."],
  ["TELL_ME_ABOUT_YOURSELF_01", "Walk me through your background."],
  ["WHY_COMPANY_01", "Why are you interested in our company?"],
  ["WHY_ROLE_01", "Why does this role make sense for you?"],
  ["ROLE_FIT_01", "What makes you a strong fit for this product role?"],
  ["HEALTHCARE_WORKFLOW_01", "How do you approach healthcare workflow discovery?"],
  ["REQUIREMENTS_LAUNCH_01", "How do you gather requirements and define what done means?"],
  ["AI_WORKFLOWS_01", "Tell me about your AI workflow experience."],
  ["CROSS_FUNCTIONAL_01", "How do you work across engineering, design, clinical, and operations teams?"],
  ["AMBIGUITY_01", "Tell me about a time you worked through ambiguity."],
  ["TRADEOFFS_01", "Tell me about a hard product tradeoff."],
  ["IMPACT_METRICS_01", "What impact metrics are you proud of?"],
  ["HANDS_ON_01", "This role is hands-on. How do you think about that?"],
  ["GAP_BRIDGE_01", "What if you do not have direct experience in this exact domain?"],
  ["QUESTIONS_FOR_THEM_01", "What questions do you have for us?"],
  ["CLOSING_01", "Is there anything else you want us to know?"],
  ["NONE", "What was your exact compensation at your last company?"],
  ["NONE", "Did you personally lead SOC 2 audits?"],
  ["NONE", "Can you describe your Rust kernel development experience?"],
  ["NONE", "What confidential roadmap details can you share?"]
];

const STOP_WORDS = new Set([
  "a", "about", "across", "after", "an", "and", "are", "as", "at", "be", "by", "can", "did", "do", "does",
  "for", "from", "have", "how", "i", "in", "is", "it", "me", "of", "on", "or", "our", "personally", "that",
  "the", "their", "this", "through", "to", "us", "was", "what", "when", "why", "with", "you", "your"
]);

const DEFAULT_STORY_BANK_PATH = "/Users/stephanie/Documents/New project 4/story-bank/data/stories.yml";
const DEFAULT_APPROVED_METRICS_PATH = "/Users/stephanie/.codex/skills/resume-package/assets/resume_app_infra/source_data/approved-metrics.yml";
const DEV_ROOT = "/Users/stephanie/Dev";
const DEV_INTERVIEW_GUIDE_ROOT = path.join(DEV_ROOT, "Interview Guide");
const DEV_RESUME_PACKAGES_ROOT = path.join(DEV_ROOT, "resume_packages");
const CLUELY_ARTIFACT_NAMES = [
  "cluely-answer-router.txt",
  "cluely-mode-prompt.txt",
  "cluely-retrieval-simulation.md",
  "cluely-retrieval-results.json",
  "cluely-route-debug.json",
  "cluely-interview-prep.md"
];
const GUIDE_REQUIRED_FIELDS = [
  "route",
  "section",
  "question",
  "answerType",
  "triggers",
  "primaryStory",
  "backupStories",
  "script",
  "cues",
  "facts"
];
const ANSWER_TYPE_DESCRIPTIONS = [
  "POSITIONING: High-level answer, Proof/details, and Role bridge bullets for tell me about yourself, why company, why role, why leaving, next role, or company overview. No STAR.",
  "FRAMEWORK_WITH_PROOF: High-level framework, Proof/details, and Role bridge bullets for how-do-you-think questions. Expand the proof story in STAR only if asked.",
  "BEHAVIORAL_STORY: STAR or natural STAR bullets for tell-me-about-a-time, example, conflict, mistake, failure, stakeholder pushback, experiment, ambiguity, roadmap, or influence questions.",
  "PRODUCT_DIAGNOSIS: observation, product judgment, recommendation, and metric/guardrail for critique, first logged-in experience, funnel, or improvement questions.",
  "PLAN: phased or prioritized Plan bullets for first 30/60/90, first five experiments, or what would you do first. No STAR.",
  "QUESTIONS_OR_CLOSE: short direct bullets for questions for the interviewer and closing."
];
const ANSWER_TYPES = new Set(ANSWER_TYPE_DESCRIPTIONS.map((line) => line.split(":")[0]));
const DEFAULT_SCRIPT_MAX_WORDS = 100;
const EXTENDED_SCRIPT_MAX_WORDS = 130;
const MIN_SCRIPT_WORDS = 35;
const MAX_ROUTER_ROUTES = 35;
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
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.sourceGuide) {
    await runSourceGuideMode(options);
    return;
  }
  if (!options.packageDir && options._.length) options.packageDir = options._[0];
  if (!options.packageDir) throw new Error("Missing --package-dir.");

  const packageDir = resolveHome(options.packageDir);
  const approvedPath = resolveHome(options.approvedContent || path.join(packageDir, "approved-content.json"));
  const sourceMapPath = resolveHome(options.sourceMap || path.join(packageDir, "source-map.json"));
  const sourceScriptPath = options.sourceScript ? await resolveInputFile(options.sourceScript, packageDir) : "";

  const [approvedContent, sourceMap] = await Promise.all([
    readJson(approvedPath),
    readJson(sourceMapPath)
  ]);
  const sourceAnchors = sourceScriptPath ? await extractSourceAnchors(sourceScriptPath) : [];
  const sections = buildSections(approvedContent, sourceMap, sourceAnchors);
  const outputDir = await resolveResumePackageOutputDir(options, packageDir, approvedContent, sourceMap);
  await ensureDir(outputDir);

  const uploadDocument = path.join(outputDir, "cluely-interview-prep.md");
  const modePrompt = path.join(outputDir, "cluely-mode-prompt.txt");
  const simulationReport = path.join(outputDir, "cluely-retrieval-simulation.md");
  const simulationJson = path.join(outputDir, "cluely-retrieval-results.json");
  const debugPath = path.join(outputDir, "cluely-route-debug.json");

  const simulation = runRetrievalSimulation(sections);
  const validation = validateExactScripts(sections, sourceMap);
  const result = {
    generated_on: todayDisplayDate(),
    package: path.basename(packageDir),
    company: clean(approvedContent.metadata?.company || sourceMap.company || ""),
    role_title: clean(approvedContent.metadata?.role_title || sourceMap.role_title || ""),
    setup: "Cluely individual mode",
    output_style: "hybrid exact",
    upload_document: uploadDocument,
    answer_router: "",
    mode_prompt: modePrompt,
    simulation_report: simulationReport,
    simulation_json: simulationJson,
    route_debug: debugPath,
    section_count: sections.length,
    source_script: sourceScriptPath,
    validation,
    simulation
  };

  await writeText(uploadDocument, renderUploadDocument(approvedContent, sourceMap, sections, sourceAnchors));
  await writeText(modePrompt, renderModePrompt());
  await writeJson(simulationJson, result);
  await writeJson(debugPath, buildRouteDebug({ sections, routingPrecedence: [], routeIndex: [] }, validation));
  await writeText(simulationReport, renderSimulationReport(result));

  console.log(`Generated Cluely prep: ${uploadDocument}`);
  console.log(`Mode prompt: ${modePrompt}`);
  console.log(`Retrieval simulation: ${simulationReport}`);
  console.log(`Route debug: ${debugPath}`);
  console.log(`Simulation ${simulation.passed ? "PASS" : "FAIL"} (${simulation.passed_count}/${simulation.test_count})`);
  if (!simulation.passed || !validation.passed) process.exitCode = 1;
}

async function runSourceGuideMode(options) {
  const sourceGuidePath = resolveHome(options.sourceGuide);
  if (!(await pathExists(sourceGuidePath))) throw new Error(`Missing source guide: ${sourceGuidePath}`);
  const guideText = await readText(sourceGuidePath);
  const guide = parseGuideRouterSource(guideText, sourceGuidePath);
  const outputDir = await resolveSourceGuideOutputDir(options, sourceGuidePath, guide);
  await ensureDir(outputDir);
  const storyBankPath = resolveHome(options.storyBank || DEFAULT_STORY_BANK_PATH);
  const approvedMetricsPath = resolveHome(options.approvedMetrics || DEFAULT_APPROVED_METRICS_PATH);
  const canonicalSources = await loadCanonicalValidationSources(storyBankPath, approvedMetricsPath);
  const validation = validateGuideSections(guide.sections, canonicalSources);
  const simulation = runRetrievalSimulation(guide.sections, buildGuideTestQuestions(guide.sections));

  const answerRouter = path.join(outputDir, "cluely-answer-router.txt");
  const modePrompt = path.join(outputDir, "cluely-mode-prompt.txt");
  const simulationReport = path.join(outputDir, "cluely-retrieval-simulation.md");
  const simulationJson = path.join(outputDir, "cluely-retrieval-results.json");
  const debugPath = path.join(outputDir, "cluely-route-debug.json");

  const result = {
    generated_on: todayDisplayDate(),
    package: path.basename(outputDir),
    company: guide.company,
    role_title: guide.roleTitle,
    setup: "Cluely individual mode",
    output_style: "guide router source",
    source_guide: sourceGuidePath,
    upload_document: "",
    answer_router: answerRouter,
    mode_prompt: modePrompt,
    simulation_report: simulationReport,
    simulation_json: simulationJson,
    route_debug: debugPath,
    section_count: guide.sections.length,
    story_bank: storyBankPath,
    approved_metrics: approvedMetricsPath,
    validation,
    simulation
  };

  await writeText(answerRouter, renderGuideRouterDocument(guide, sourceGuidePath));
  await writeText(modePrompt, renderModePrompt({ documentName: "answer-router text file", guide }));
  await writeJson(simulationJson, result);
  await writeJson(debugPath, buildRouteDebug(guide, validation));
  await writeText(simulationReport, renderSimulationReport(result));

  console.log(`Generated Cluely answer router: ${answerRouter}`);
  console.log(`Mode prompt: ${modePrompt}`);
  console.log(`Retrieval simulation: ${simulationReport}`);
  console.log(`Route debug: ${debugPath}`);
  console.log(`Simulation ${simulation.passed ? "PASS" : "FAIL"} (${simulation.passed_count}/${simulation.test_count})`);
  if (!simulation.passed || !validation.passed) process.exitCode = 1;
}

function parseArgs(args) {
  const options = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg.startsWith("--")) {
      const key = camelCase(arg.slice(2));
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        options[key] = true;
      } else {
        options[key] = next;
        i += 1;
      }
    } else {
      options._.push(arg);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  cluely-prep.mjs --package-dir ~/Dev/resume_packages/[package-folder]
  cluely-prep.mjs ~/Dev/resume_packages/[package-folder] --source-script /path/to/script.md
  cluely-prep.mjs --source-guide /path/to/interview-guide.md

Options:
  --package-dir       Folder containing approved-content.json and source-map.json
  --source-guide      Structured interview-guide.md containing ## Cluely Router Source
  --source-script     Optional long-form prep script with STEPHANIE ANCHOR blocks
  --output-dir        Optional Dev-only override. Existing /Users/stephanie/Dev package wins; non-Dev paths are ignored.
  --approved-content  Optional explicit approved-content.json path
  --source-map        Optional explicit source-map.json path
  --story-bank        Optional stories.yml path for --source-guide validation
  --approved-metrics  Optional approved-metrics.yml path for --source-guide validation`);
}

async function resolveSourceGuideOutputDir(options, sourceGuidePath, guide) {
  const requested = options.outputDir ? resolveHome(options.outputDir) : "";
  warnIfNonDevOutput(requested);

  const sourceDir = path.dirname(sourceGuidePath);
  if (isInsideDev(sourceDir)) return sourceDir;

  const existing = await findMatchingDevInterviewGuidePackage(guide, sourceGuidePath);
  if (existing) return existing;
  if (requested && isInsideDev(requested)) return requested;

  return path.join(DEV_INTERVIEW_GUIDE_ROOT, safeFolderName(guide.title || guide.roleTitle || path.basename(sourceDir)));
}

async function resolveResumePackageOutputDir(options, packageDir, approvedContent, sourceMap) {
  const requested = options.outputDir ? resolveHome(options.outputDir) : "";
  warnIfNonDevOutput(requested);

  const devPackageDir = await findMatchingDevResumePackage(packageDir, approvedContent, sourceMap);
  if (devPackageDir) return path.join(devPackageDir, "interview-prep");
  if (requested && isInsideDev(requested)) return requested;

  const packageName = safeFolderName(path.basename(packageDir) || approvedContent.metadata?.company || sourceMap.company || "cluely-package");
  return path.join(DEV_RESUME_PACKAGES_ROOT, packageName, "interview-prep");
}

async function findMatchingDevInterviewGuidePackage(guide, sourceGuidePath) {
  const target = [
    guide.title,
    guide.company,
    guide.roleTitle,
    path.basename(path.dirname(sourceGuidePath))
  ].filter(Boolean).join(" ");
  const candidates = await listSubdirectories(DEV_INTERVIEW_GUIDE_ROOT);
  let best = null;

  for (const dir of candidates) {
    const candidateText = [path.basename(dir)];
    const candidateGuide = path.join(dir, "interview-guide.md");
    if (await pathExists(candidateGuide)) {
      candidateText.push(inferGuideTitle(await readText(candidateGuide), candidateGuide).rawTitle);
    }
    const score = tokenOverlapScore(target, candidateText.join(" "))
      + ((await hasCluelyArtifacts(dir)) ? 0.2 : 0)
      + ((await pathExists(candidateGuide)) ? 0.1 : 0);
    if (!best || score > best.score) best = { dir, score };
  }

  return best && best.score >= 0.45 ? best.dir : "";
}

async function findMatchingDevResumePackage(packageDir, approvedContent, sourceMap) {
  if (isInsideDev(packageDir)) return packageDir;

  const target = [
    path.basename(packageDir),
    approvedContent.metadata?.company,
    approvedContent.metadata?.role_title,
    sourceMap.company,
    sourceMap.role_title
  ].filter(Boolean).join(" ");
  const candidates = await listSubdirectories(DEV_RESUME_PACKAGES_ROOT);
  let best = null;

  for (const dir of candidates) {
    const candidateText = [path.basename(dir)];
    for (const fileName of ["approved-content.json", "source-map.json"]) {
      const filePath = path.join(dir, fileName);
      if (!(await pathExists(filePath))) continue;
      try {
        const data = JSON.parse(await readText(filePath));
        candidateText.push(data.metadata?.company, data.metadata?.role_title, data.company, data.role_title);
      } catch {
        // Ignore malformed package metadata while scanning.
      }
    }
    const score = tokenOverlapScore(target, candidateText.filter(Boolean).join(" "))
      + ((await hasCluelyArtifacts(path.join(dir, "interview-prep"))) ? 0.2 : 0);
    if (!best || score > best.score) best = { dir, score };
  }

  return best && best.score >= 0.45 ? best.dir : "";
}

function buildSections(content, sourceMap, sourceAnchors) {
  const company = clean(content.metadata?.company || sourceMap.company || "the company");
  const roleTitle = clean(content.metadata?.role_title || sourceMap.role_title || "the role");
  const thesis = clean(content.positioning?.role_fit_thesis);
  const hero = clean(content.positioning?.hero_subtitle);
  const concern = clean(content.positioning?.concern_to_address || content.role_analysis?.concern_or_gap);
  const priorities = sentenceList(content.role_analysis?.company_priorities, 3);
  const requiredSkills = sentenceList(content.role_analysis?.required_skills, 4);
  const selectedClaims = sourceMap.selected_claims || [];
  const topClaims = selectedClaims.slice(0, 6);
  const metricFacts = formatMetricFacts(sourceMap.selected_metrics || []);
  const roleKeywords = sentenceList(content.role_analysis?.role_keywords, 6);
  const selectedSkills = sentenceList(sourceMap.selected_resume_skills || content.resume?.skills, 4);
  const coverLetterReason = firstParagraph(content.cover_letter?.paragraphs);
  const anchorByTopic = indexAnchorsByTopic(sourceAnchors, { company, roleTitle });

  const tellMeScript = [
    "I currently lead product and patient experience across Starlight and Kannact, where my work sits at the intersection of product, care delivery, operations, and AI-enabled workflow design.",
    "The simplest way to describe my background is that I turn complex healthcare ideas into workflows and systems people can actually use.",
    topClaims[0]?.text ? `A few proof points: ${topClaims.slice(0, 3).map((claim) => claim.text).join(" ")}` : "",
    `What makes ${roleTitle} at ${company} feel aligned is that it needs someone who can move between strategy, requirements, launch readiness, stakeholder alignment, and the real operational details that make a product work.`
  ].filter(Boolean).join(" ");

  const whyCompanyScript = [
    coverLetterReason || `I am interested in ${company} because the role sits close to problems where product quality depends on understanding the real workflow, not just the feature surface.`,
    priorities ? `The priorities I see are ${priorities}.` : "",
    "That is the kind of environment where I do my best work: translating ambiguity into clear requirements, practical operating models, and launches that teams can actually adopt."
  ].filter(Boolean).join(" ");

  const workflowScript = [
    "I start with how the work actually happens, not with the requested feature.",
    "I map the user, trigger, steps, systems, handoffs, decisions, exceptions, and desired outcome.",
    "In healthcare, that matters because the product is usually only one part of a larger care delivery workflow.",
    claimText(selectedClaims, ["workflow", "provider", "clinician", "requirements"]),
    "That approach helps me avoid building something that works technically but fails operationally."
  ].filter(Boolean).join(" ");

  return [
    section("TELL_ME_ABOUT_YOURSELF_01", "Tell Me About Yourself", [
      "tell me about yourself", "walk me through your background", "give me the overview", "introduce yourself", "your career story"
    ], preferAnchor(anchorByTopic.tell_me_about_yourself, tellMeScript), [
      "Healthcare workflow builder", "Product plus operations", "AI with judgment", "Hands-on launch leader"
    ], sourceFacts(topClaims.slice(0, 4), metricFacts)),

    section("WHY_COMPANY_01", `Why ${company}`, [
      `why ${company}`, "why are you interested", "why this company", "what excites you about us", "why do you want to work here"
    ], preferAnchor(anchorByTopic.why_company, whyCompanyScript), [
      "Workflow depth", "Mission fit", "Operational clarity", "Scalable care/product"
    ], compactFacts([thesis, hero, priorities])),

    section("WHY_ROLE_01", `Why ${roleTitle}`, [
      `why ${roleTitle}`, "why this role", "why does this role make sense", "role make sense", "why now", "what are you looking for", "what kind of role fits you"
    ], [
      "This role fits because it asks for the combination I have kept building toward: product judgment, requirements clarity, workflow design, cross-functional execution, and comfort staying close to the operational details.",
      requiredSkills ? `The skill pattern I see is ${requiredSkills}.` : "",
      "That is exactly where I am strongest: making ambiguous healthcare or workflow-heavy ideas concrete enough for teams to build, launch, measure, and improve."
    ].filter(Boolean).join(" "), [
      "Product judgment", "Requirements clarity", "Execution muscle", "Close to workflow"
    ], compactFacts([thesis, selectedSkills])),

    section("ROLE_FIT_01", "Role Fit Thesis", [
      "why are you a fit", "what makes you qualified", "why should we hire you", "what strengths would you bring", "how does your experience map to this role"
    ], thesis || "My fit is the ability to turn complex workflow-driven problems into clear product direction, practical requirements, and adoption-ready launches.", [
      "Workflow to requirements", "Launch-ready execution", "Stakeholder alignment", "Measured outcomes"
    ], compactFacts([thesis, roleKeywords, selectedSkills])),

    section("HEALTHCARE_WORKFLOW_01", "Healthcare Workflow Discovery", [
      "workflow discovery", "healthcare workflows", "understand user needs", "clinical workflow", "how do you do discovery", "before during after"
    ], preferAnchor(anchorByTopic.workflow, workflowScript), [
      "User, trigger, steps", "Systems and handoffs", "Decisions and exceptions", "Outcome and risk"
    ], sourceFacts(filterClaims(selectedClaims, ["workflow", "provider", "clinician", "requirements"]).slice(0, 3), [])),

    section("REQUIREMENTS_LAUNCH_01", "Requirements And Launch Readiness", [
      "requirements", "acceptance criteria", "define done", "launch readiness", "product operations", "write a spec", "business logic"
    ], preferAnchor(anchorByTopic.requirements, [
      "My requirements process starts by getting the raw workflow clear: who is doing the work, what decision they need to make, what information is missing, what edge cases matter, and what risk we are trying to reduce.",
      "Then I turn that into requirements, acceptance criteria, QA notes, launch dependencies, training needs, and success measures.",
      "I use AI aggressively to structure transcripts and notes, but I treat it as a drafting layer. I still review the details myself because healthcare workflows are too sensitive to outsource judgment."
    ].join(" ")), [
      "Raw workflow first", "Acceptance criteria", "QA and training", "Success measures"
    ], sourceFacts(filterClaims(selectedClaims, ["requirements", "launch", "rollout", "qa"]).slice(0, 4), [])),

    section("AI_WORKFLOWS_01", "AI Workflow Experience", [
      "ai experience", "ai workflow experience", "ai workflow", "ai workflows", "llm", "automation", "medical record summarization", "documentation", "human in the loop"
    ], preferAnchor(anchorByTopic.ai, [
      claimText(selectedClaims, ["ai", "documentation", "summarization"]) || "I have used AI most practically in healthcare workflow and documentation contexts.",
      "My philosophy is that AI should reduce operational burden without weakening human review.",
      "I look for places where messy text, transcripts, records, or repetitive documentation can be structured into something useful, then I define evaluation criteria, review loops, and escalation rules so the workflow stays trustworthy."
    ].join(" ")), [
      "Reduce burden", "Human review", "Evaluation criteria", "Trustworthy automation"
    ], sourceFacts(filterClaims(selectedClaims, ["ai", "documentation", "summarization", "automation"]).slice(0, 4), metricFacts)),

    section("CROSS_FUNCTIONAL_01", "Cross-Functional Leadership", [
      "cross functional", "stakeholder alignment", "work with engineering", "work with design", "work with clinical", "work with operations", "influence without authority"
    ], [
      "I try to become the connective tissue between teams without making myself a bottleneck.",
      "That means getting the workflow and decision logic clear, naming tradeoffs early, documenting what changed, and making sure design, engineering, clinical, operations, compliance, and training teams are working from the same version of reality.",
      claimText(selectedClaims, ["cross-functional", "stakeholder", "partner", "clinical operations"])
    ].filter(Boolean).join(" "), [
      "Shared reality", "Tradeoffs early", "Clear owner", "Decision history"
    ], sourceFacts(filterClaims(selectedClaims, ["cross-functional", "partner", "stakeholder", "clinical"]).slice(0, 4), [])),

    section("AMBIGUITY_01", "Ambiguity", [
      "ambiguity", "unclear problem", "messy problem", "not enough information", "early stage", "0 to 1"
    ], [
      "My default in ambiguity is to make the work visible.",
      "I separate what we know, what we believe, what we need to learn, and what decision we are trying to make.",
      "Then I turn that into a thin next step: a workflow map, a decision memo, a prototype, a requirements draft, or a pilot that helps the team learn without pretending we know everything upfront.",
      claimText(selectedClaims, ["ambiguity", "0-to-1", "vision", "scale"])
    ].filter(Boolean).join(" "), [
      "Knowns and unknowns", "Decision needed", "Thin next step", "Learn fast"
    ], sourceFacts(filterClaims(selectedClaims, ["ambiguity", "vision", "scale", "0-to-1"]).slice(0, 3), [])),

    section("TRADEOFFS_01", "Tradeoffs And Conflict", [
      "tradeoff", "conflict", "disagreement", "prioritization", "hard decision", "competing priorities", "pushback"
    ], [
      "When there is a hard tradeoff, I try to get the team out of preference language and into decision criteria.",
      "In healthcare, that usually means balancing patient impact, clinical risk, compliance, operational load, technical complexity, and business timing.",
      claimText(selectedClaims, ["tradeoff", "regulatory", "clinical priorities", "risk"]),
      "Once the criteria are clear, the conversation becomes less personal and more useful."
    ].filter(Boolean).join(" "), [
      "Decision criteria", "Patient impact", "Risk and compliance", "Operational load"
    ], sourceFacts(filterClaims(selectedClaims, ["tradeoff", "risk", "compliance", "regulatory"]).slice(0, 3), [])),

    section("IMPACT_METRICS_01", "Impact Metrics", [
      "metrics", "impact", "results", "outcomes", "success measures", "what are you proud of", "numbers"
    ], [
      "The metrics I would anchor on are the ones that show both product quality and operational usefulness.",
      metricFacts.length ? `Relevant proof points include ${metricFacts.map((fact) => fact.text).join("; ")}.` : "",
      "I try to use metrics as evidence of a workflow getting better, not just as decoration."
    ].filter(Boolean).join(" "), [
      "Quality plus operations", "Adoption signal", "Efficiency signal", "Patient/team value"
    ], metricFacts.map((fact) => `${fact.id}: ${fact.text}`)),

    section("HANDS_ON_01", "Hands-On Role Bridge", [
      "hands on", "chief title", "too senior", "individual contributor", "closer to execution", "will you write requirements"
    ], [
      "The hands-on part is a feature for me, not a concern.",
      "My title has reflected range, but I have stayed very close to the work: writing requirements, mapping workflows, supporting launch readiness, training teams, reviewing transcripts, and working through edge cases with product, engineering, clinical, and operations partners.",
      "I am not looking to be far away from the product. I am looking for the right place to do deep, useful product work."
    ].join(" "), [
      "Title means range", "Still in the work", "Requirements and launch", "Deep product work"
    ], sourceFacts(filterClaims(selectedClaims, ["hands-on", "requirements", "launch", "workflow"]).slice(0, 3), [])),

    section("GAP_BRIDGE_01", "Domain Gap Bridge", [
      "domain gap", "direct experience", "no experience", "not from this industry", "concern", "what would you need to learn"
    ], [
      concern || "If there is a domain gap, I would address it directly and then anchor on the transferable pattern.",
      "My transferable strength is learning the workflow quickly, identifying the decisions and risks that matter, and translating that into product requirements, stakeholder alignment, launch plans, and measurable outcomes."
    ].join(" "), [
      "Name the gap", "Transferable pattern", "Learn workflow fast", "Reduce risk"
    ], compactFacts([concern, selectedSkills])),

    section("QUESTIONS_FOR_THEM_01", "Questions For Them", [
      "questions for us", "questions do you have", "what questions do you have", "what would you ask", "anything you want to know", "interviewer questions", "your questions"
    ], [
      "I would love to understand where the team most needs leverage right now.",
      "Is the bigger challenge clarifying strategy, translating requirements, improving delivery cadence, reducing operational burden, or getting stronger feedback loops after launch?",
      "I am also curious what great performance in this role would look like after the first six months."
    ].join(" "), [
      "Where leverage needed", "Strategy or execution", "Feedback loops", "Six-month success"
    ], compactFacts([priorities, requiredSkills])),

    section("CLOSING_01", "Closing", [
      "anything else", "final thoughts", "why should we move forward", "close us", "last thing"
    ], [
      "The thing I would emphasize is that I am strongest when the work is complex enough to need real synthesis.",
      "I can sit with ambiguity, translate between different teams, make the workflow concrete, and keep the product connected to the people who actually have to use it.",
      `That is the kind of work I would be excited to bring to ${company}.`
    ].join(" "), [
      "Synthesis", "Workflow concrete", "Cross-team translation", "Excited to contribute"
    ], compactFacts([thesis, hero]))
  ];
}

function section(id, title, triggers, script, cues, facts) {
  return {
    id,
    title,
    question: "",
    route: id,
    section: title,
    primaryStory: "",
    backupStories: [],
    triggers: unique(triggers).map(clean).filter(Boolean),
    script: cleanScript(script),
    cues: unique(cues).map(clean).filter(Boolean).slice(0, 5),
    facts: unique(facts || []).map(clean).filter(Boolean).slice(0, 6),
    storyIds: []
  };
}

function parseGuideRouterSource(text, sourceGuidePath) {
  const body = extractCluelyRouterSection(text);
  const title = inferGuideTitle(text, sourceGuidePath);
  const sections = parseRouteBlocks(body);
  return {
    sourceGuidePath,
    company: title.company,
    roleTitle: title.roleTitle,
    title: title.rawTitle,
    routingPrecedence: parseBlockListValue(extractNamedBlock(body, "ROUTING PRECEDENCE")),
    routeIndex: parseBlockListValue(extractNamedBlock(body, "ROUTE INDEX")),
    sections
  };
}

function extractCluelyRouterSection(text) {
  const marker = /^## Cluely Router Source\s*$/m.exec(text);
  if (!marker) throw new Error("Missing ## Cluely Router Source section.");
  const rest = text.slice(marker.index + marker[0].length);
  const nextHeading = /^##\s+(?!Cluely Router Source\b).+$/m.exec(rest);
  return nextHeading ? rest.slice(0, nextHeading.index) : rest;
}

function inferGuideTitle(text, sourceGuidePath) {
  const titleLine = /^#\s+(.+?)\s*$/m.exec(text)?.[1] || path.basename(path.dirname(sourceGuidePath));
  const cleanTitle = clean(titleLine.replace(/\binterview guide\b/i, ""));
  return {
    rawTitle: titleLine,
    company: "",
    roleTitle: cleanTitle,
  };
}

function extractNamedBlock(body, label) {
  const pattern = new RegExp(`^###\\s+${escapeRegex(label)}\\s*$`, "im");
  const match = pattern.exec(body);
  if (!match) return "";
  const rest = body.slice(match.index + match[0].length);
  const next = /^###\s+/m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function parseRouteBlocks(body) {
  const matches = [...body.matchAll(/^###\s+ROUTE\s+(?!INDEX\b)(.+?)\s*$/gim)];
  if (!matches.length) throw new Error("No route blocks found. Each route must start with '### ROUTE ...'.");
  return matches.map((match, index) => {
    const next = matches[index + 1];
    const raw = body.slice(match.index, next ? next.index : body.length).trim();
    const header = clean(`ROUTE ${match[1]}`);
    return parseRouteBlock(header, raw, index);
  });
}

function parseRouteBlock(header, raw, index) {
  const fields = parseRouteFields(raw);
  const route = clean(fields.route || header || `ROUTE ${String(index + 1).padStart(2, "0")}`);
  const id = normalizeRouteId(route);
  const primaryStory = clean(fields.primaryStory || "");
  const backupStories = parseListValue(fields.backupStories || "");
  const facts = parseListValue(fields.facts || "");
  const depth = parseListValue(fields.depth || "");
  const script = cleanScript(fields.script || "");
  const sectionName = clean(fields.section || "");
  const question = clean(fields.question || "");
  const triggers = parseListValue(fields.triggers || "").map(clean).filter(Boolean);
  const answerType = clean(fields.answerType || inferAnswerType({ route, sectionName, question, triggers }));
  return {
    id,
    title: clean(question || sectionName || route),
    route,
    section: sectionName,
    question,
    answerType,
    primaryStory,
    backupStories,
    triggers,
    script,
    cues: parseListValue(fields.cues || "").map(clean).filter(Boolean).slice(0, 8),
    facts,
    depth,
    storyIds: storyIdsFromText(`${primaryStory}\n${backupStories.join("\n")}\n${facts.join("\n")}\n${depth.join("\n")}`),
    rawFields: fields
  };
}

function inferAnswerType({ route, sectionName, question, triggers }) {
  const text = normalizeText([route, sectionName, question, ...(triggers || [])].join(" "));
  if (hasAny(text, ["questions for", "questions do you have", "what questions", "ask us", "closing", "final thoughts", "anything else", "move forward"])) return "QUESTIONS_OR_CLOSE";
  if (hasAny(text, ["first 30", "first 60", "first 90", "30 60 90", "first five", "what would you do first", "getting started"])) return "PLAN";
  if (hasAny(text, ["tell me about a time", "give me an example", "stakeholder pushback", "push back", "failure", "mistake", "lesson learned", "conflict", "difficult stakeholder", "roadmap ownership", "customer implementation", "partner implementation", "hospitalization summary", "scrappy startup", "ambiguity incomplete"])) return "BEHAVIORAL_STORY";
  if (hasAny(text, ["product critique", "first impression", "logged in", "funnel diagnosis", "what would you improve"])) return "PRODUCT_DIAGNOSIS";
  if (hasAny(text, ["tell me about yourself", "walk me through", "background", "why amae", "why galileo", "why this company", "why this role", "role fit", "mission", "mental health", "leadership style", "company interest"])) return "POSITIONING";
  if (hasAny(text, ["how do you", "how would you", "framework", "metrics", "data feedback", "clinical leader", "financial modeling", "safety critical", "privacy", "scale", "standardization", "bottleneck", "prioritization", "ai clinical"])) return "FRAMEWORK_WITH_PROOF";
  return "FRAMEWORK_WITH_PROOF";
}

function parseRouteFields(raw) {
  const fields = {};
  const pattern = /^(ROUTE|SECTION|QUESTION|TRIGGERS|ANSWER TYPE|PRIMARY STORY|PRIMARY STORIES|BACKUP STORIES|SCRIPT|CUES|SOURCE FACTS|FOLLOW-UP DEPTH):\s*(.*)$/gim;
  const matches = [...raw.matchAll(pattern)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const key = normalizeFieldName(match[1]);
    const inline = match[2] || "";
    const extra = raw.slice(match.index + match[0].length, next ? next.index : raw.length).trim();
    fields[key] = [inline.trim(), extra].filter(Boolean).join("\n").trim();
  }
  return fields;
}

function normalizeFieldName(name) {
  const key = normalizeText(name);
  if (key === "primary story" || key === "primary stories") return "primaryStory";
  if (key === "backup stories") return "backupStories";
  if (key === "source facts") return "facts";
  if (key === "follow up depth") return "depth";
  return key.replace(/\s+([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseListValue(value) {
  return unique(String(value || "")
    .split(/\n|;/)
    .map((line) => clean(line.replace(/^\s*[-*]\s*/, "")))
    .filter(Boolean));
}

function parseBlockListValue(value) {
  return unique(String(value || "")
    .split(/\n/)
    .map((line) => clean(line.replace(/^\s*[-*]\s*/, "")))
    .filter(Boolean));
}

function normalizeRouteId(route) {
  return clean(route)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "ROUTE";
}

function renderGuideRouterDocument(guide, sourceGuidePath) {
  const lines = [
    `# Cluely Answer Router - ${guide.title}`.trim(),
    "",
    `Generated: ${todayDisplayDate()}`,
    `Source guide: ${sourceGuidePath}`,
    "Setup: Cluely individual mode / low-latency answer-router upload",
    `Route budget: ${guide.sections.length}/${MAX_ROUTER_ROUTES} routes. Consolidate overlapping routes before adding new ones.`,
    "Contract: use route IDs internally for matching, but never display route IDs, section labels, debug labels, or source labels to Stephanie.",
    "",
    "Behavior: match QUESTION/TRIGGERS first; preserve the route ANSWER TYPE; render the visible answer as 2-5 speakable bullets using `High-level answer` and `Proof/details`, plus STAR bullets only when the route is story-first; expand from CUES/DEPTH/SOURCE FACTS as bullets only on follow-up or when Stephanie needs more detail while telling a story; never invent facts, metrics, employers, titles, dates, tools, or outcomes; if unsupported return `No prepared answer found`.",
    "",
    "Visible answer bullet contract:",
    "- Every route should have a high-level answer: the direct answer or core principle.",
    "- Every route should include proof/details: one concrete proof point, detail, metric, or relevant source fact when available.",
    "- BEHAVIORAL_STORY routes should use STAR or natural STAR bullets: situation/task, action, result, and role bridge when useful.",
    "- Non-story routes should not force STAR; use framework, plan, question, close, or role bridge bullets as appropriate.",
    "",
    "Answer types:",
    ...ANSWER_TYPE_DESCRIPTIONS.map((line) => `- ${line}`),
    "- Do not force STAR across every answer. Use STAR only for BEHAVIORAL_STORY routes or optional proof-story follow-ups.",
    "",
    "## Routing Precedence",
    "",
    ...(guide.routingPrecedence.length ? guide.routingPrecedence.map((item) => `- ${item}`) : ["- Exact question and trigger matches outrank broad thematic matches."]),
    "",
    "## Route Index",
    "",
    ...(guide.routeIndex.length ? guide.routeIndex.map((item) => `- ${item}`) : guide.sections.map((item) => `- ${item.route}: ${item.question}`)),
    "",
    "## Routes",
    ""
  ];

  for (const item of guide.sections) {
    lines.push(
      `## ${item.route}`,
      `ID: ${item.id}`,
      `SECTION: ${item.section}`,
      `QUESTION: ${item.question}`,
      `ANSWER TYPE: ${item.answerType || "UNSPECIFIED"}`,
      `TRIGGERS: ${item.triggers.join(" | ")}`,
      `PRIMARY STORY: ${item.primaryStory}`,
      `BACKUP STORIES: ${item.backupStories.length ? item.backupStories.join(" | ") : "None"}`,
      "SCRIPT:",
      item.script,
      `CUES: ${item.cues.join(" | ")}`,
      ...(item.depth.length ? [`DEPTH: ${item.depth.join(" | ")}`] : []),
      `SOURCE FACTS: ${item.facts.join(" | ")}`,
      ""
    );
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

function buildRouteDebug(guide, validation) {
  return {
    generated_on: new Date().toISOString(),
    route_count: guide.sections.length,
    routing_precedence: guide.routingPrecedence || [],
    route_index: guide.routeIndex || [],
    validation,
    routes: guide.sections.map((item) => ({
      id: item.id,
      route: item.route,
      section: item.section,
      question: item.question,
      answer_type: item.answerType || "",
      primary_story: item.primaryStory,
      backup_stories: item.backupStories,
      story_ids: item.storyIds || [],
      trigger_count: item.triggers.length,
      cue_count: item.cues.length,
      depth_count: item.depth?.length || 0,
      source_fact_count: item.facts.length,
      word_count: wordCount(item.script),
      length_exception: scriptLengthException(item) || null,
      metric_tokens: metricLikeTokens([item.script, ...(item.depth || []), ...item.facts].join(" "))
    }))
  };
}

function buildGuideTestQuestions(sections) {
  const routeTests = sections.flatMap((item) => {
    const tests = [];
    if (item.question) tests.push([item.id, item.question]);
    if (item.triggers[0] && normalizeText(item.triggers[0]) !== normalizeText(item.question)) tests.push([item.id, item.triggers[0]]);
    return tests;
  });
  return [
    ...routeTests,
    ["NONE", "What was your exact compensation at your last company?"],
    ["NONE", "Can you share confidential roadmap details?"],
    ["NONE", "Can you give legal or medical advice?"]
  ];
}

async function loadCanonicalValidationSources(storyBankPath, approvedMetricsPath) {
  const missing = [];
  let storyBankText = "";
  let approvedMetricsText = "";
  if (await pathExists(storyBankPath)) storyBankText = await readText(storyBankPath);
  else missing.push(`Missing story bank: ${storyBankPath}`);
  if (await pathExists(approvedMetricsPath)) approvedMetricsText = await readText(approvedMetricsPath);
  else missing.push(`Missing approved metrics: ${approvedMetricsPath}`);
  return {
    storyBankPath,
    approvedMetricsPath,
    storyBankIds: extractStoryBankIds(storyBankText),
    canonicalMetricText: normalizeMetricText(`${storyBankText}\n${approvedMetricsText}`),
    missing
  };
}

function validateGuideSections(sections, sources) {
  const warnings = [...(sources.missing || [])];
  const errors = [];
  const seenIds = new Set();
  if (!sections.length) errors.push("No Cluely routes were found.");
  if (sections.length > MAX_ROUTER_ROUTES) {
    errors.push(`Router has ${sections.length} routes; max is ${MAX_ROUTER_ROUTES} for Cluely latency. Consolidate overlapping routes or move lower-probability material into CUES/SOURCE FACTS.`);
  }
  errors.push(...validateStandardCoverage(sections));
  for (const item of sections) {
    if (seenIds.has(item.id)) errors.push(`Duplicate route ID: ${item.id}`);
    seenIds.add(item.id);

    for (const field of GUIDE_REQUIRED_FIELDS) {
      if (field === "answerType" && item.answerType) continue;
      const value = item.rawFields?.[field];
      if (value === undefined || !clean(value)) errors.push(`${item.route} is missing ${fieldLabel(field)}.`);
    }

    if (!item.triggers.length) errors.push(`${item.route} has no triggers.`);
    if (!item.cues.length) errors.push(`${item.route} has no cues.`);
    if (!item.facts.length) errors.push(`${item.route} has no source facts.`);
    const answerType = clean(item.answerType || "").toUpperCase();
    if (answerType && !ANSWER_TYPES.has(answerType)) {
      errors.push(`${item.route} has unknown answer type '${item.answerType}'. Use one of: ${[...ANSWER_TYPES].join(", ")}.`);
    }

    const scriptWords = wordCount(item.script);
    if (scriptWords < MIN_SCRIPT_WORDS) warnings.push(`${item.route} script is short (${scriptWords} words); confirm it is intentionally cue-like.`);
    const lengthException = scriptLengthException(item);
    if (scriptWords > DEFAULT_SCRIPT_MAX_WORDS && !lengthException) {
      errors.push(`${item.route} script is ${scriptWords} words; default max is ${DEFAULT_SCRIPT_MAX_WORDS}. Keep the first answer concise and move depth into CUES/SOURCE FACTS for follow-up.`);
    } else if (scriptWords > EXTENDED_SCRIPT_MAX_WORDS) {
      errors.push(`${item.route} script is ${scriptWords} words; even length-exception scripts max out at ${EXTENDED_SCRIPT_MAX_WORDS}.`);
    } else if (scriptWords > DEFAULT_SCRIPT_MAX_WORDS) {
      warnings.push(`${item.route} script is ${scriptWords} words; allowed as ${lengthException}, but keep exceptions rare.`);
    }

    for (const storyId of item.storyIds || []) {
      if (!sources.storyBankIds.has(storyId)) errors.push(`${item.route} references unknown story ID ${storyId}.`);
    }

    for (const conflict of blockedMetricConflicts([item.script, ...(item.depth || []), ...item.facts].join(" "))) {
      errors.push(`${item.route} uses retired/conflicting metric: ${conflict}.`);
    }

    for (const token of metricLikeTokens([item.script, ...(item.depth || []), ...item.facts].join(" "))) {
      if (!metricTokenApproved(token, sources.canonicalMetricText)) {
        warnings.push(`${item.route} uses metric-like token '${token}' that was not found in the story bank or approved metrics.`);
      }
    }
  }
  return { passed: errors.length === 0, warnings: unique(warnings), errors: unique(errors) };
}

function fieldLabel(field) {
  return field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^facts$/, "source facts");
}

function scriptLengthException(item) {
  const text = [
    item.id,
    item.route,
    item.section,
    item.question,
    item.primaryStory,
    ...(item.triggers || []),
    ...(item.cues || []),
    ...(item.facts || [])
  ].join("\n");
  if (/\bSCRIPT LENGTH EXCEPTION:\s*CORE_NARRATIVE\b/i.test(text)) return "CORE_NARRATIVE";
  if (/\bSCRIPT LENGTH EXCEPTION:\s*FUNDAMENTAL_STORY\b/i.test(text)) return "FUNDAMENTAL_STORY";
  if (/\bTELL_ME_ABOUT_YOURSELF\b/i.test(text) || /\bCore Narrative\b/i.test(text)) return "CORE_NARRATIVE";
  return "";
}

function validateStandardCoverage(sections) {
  return STANDARD_ROUTER_COVERAGE
    .filter((category) => !sections.some((sectionItem) => routeMatchesCategory(sectionItem, category)))
    .map((category) => `Missing standard interview coverage route: ${category.label}.`);
}

function routeMatchesCategory(sectionItem, category) {
  const text = [
    sectionItem.id,
    sectionItem.route,
    sectionItem.section,
    sectionItem.question,
    ...(sectionItem.triggers || []),
    sectionItem.script,
    ...(sectionItem.cues || []),
    ...(sectionItem.facts || [])
  ].join("\n");
  return category.patterns.some((pattern) => pattern.test(text));
}

function extractStoryBankIds(text) {
  return new Set([...String(text || "").matchAll(/- id:\s*(STORY_[A-Z0-9_]+)/g)].map((match) => match[1]));
}

function storyIdsFromText(text) {
  return unique(String(text || "").match(/\bSTORY_[A-Z0-9_]+\b/g) || []);
}

function blockedMetricConflicts(text) {
  const source = String(text || "");
  const conflicts = [];
  if (/\$4,?044\b/.test(source)) conflicts.push("$4,044");
  if (/\b30%\s*(?:->|to|-)\s*40%\b/i.test(source)) conflicts.push("30% to 40%");
  if (/\b77%\s*(?:->|to|-)\s*95%\b/i.test(source)) conflicts.push("77% to 95%");
  if (/\b95%\s+(?:patient|participant)?\s*satisfaction\b/i.test(source)) conflicts.push("95% satisfaction");
  return conflicts;
}

function metricTokenApproved(token, canonicalMetricText) {
  const normalized = normalizeMetricText(token);
  return !normalized || canonicalMetricText.includes(normalized);
}

function normalizeMetricText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[$,]/g, "")
    .replace(/\bk\b/g, "000")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function extractSourceAnchors(sourceScriptPath) {
  const text = await readText(sourceScriptPath);
  const anchors = [];
  const pattern = /STEPHANIE ANCHOR:\s*\n\n([\s\S]*?)(?=\n## |\n[A-Z][A-Z ]+:\n|\n---|\n$)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const raw = match[1].split("\n").map((line) => line.trim()).filter(Boolean).join(" ");
    const script = cleanScript(raw.replace(/^["\u201c]|["\u201d]$/g, ""));
    if (!script) continue;
    anchors.push({
      id: `SOURCE_ANCHOR_${String(anchors.length + 1).padStart(2, "0")}`,
      script,
      topic: inferAnchorTopic(script)
    });
  }
  return anchors;
}

function inferAnchorTopic(text) {
  const normalized = normalizeText(text);
  if (hasAny(normalized, ["currently lead", "simplest way", "background", "tell me"])) return "tell_me_about_yourself";
  if (hasAny(normalized, ["excited about", "stands out", "why", "feels aligned"])) return "why_company";
  if (hasAny(normalized, ["workflow first", "work actually happens", "feature request"])) return "workflow";
  if (hasAny(normalized, ["requirements", "acceptance criteria", "done looks like"])) return "requirements";
  if (hasAny(normalized, [" ai ", "documentation", "summarization", "llm"])) return "ai";
  return "general";
}

function indexAnchorsByTopic(anchors, target) {
  const out = {};
  for (const anchor of anchors) {
    if (!anchorCompatibleWithTarget(anchor, target)) continue;
    if (!out[anchor.topic]) out[anchor.topic] = anchor.script;
  }
  return out;
}

function anchorCompatibleWithTarget(anchor, target) {
  const text = normalizeText(anchor.script);
  const targetText = normalizeText(`${target.company} ${target.roleTitle}`);
  const targetHasMigraineContext = hasAny(targetText, ["haven", "migraine", "headache", "neurology"]);
  if (!targetHasMigraineContext && hasAny(text, ["haven", "migraine", "headache", "neura", "cove", "botox", "cgrp", "gepants", "neuromodulation"])) {
    return false;
  }
  const companyTokens = tokenSet(target.company).size ? [...tokenSet(target.company)] : [];
  const explicitCompany = companyTokens.length && companyTokens.some((token) => text.includes(token));
  if (hasAny(text, ["feels aligned about", "excited about", "stands out to me"]) && !explicitCompany) {
    return false;
  }
  return true;
}

function preferAnchor(anchor, fallback) {
  if (!anchor || wordCount(anchor) > DEFAULT_SCRIPT_MAX_WORDS) return fallback;
  return anchor;
}

function renderUploadDocument(content, sourceMap, sections, sourceAnchors) {
  const company = clean(content.metadata?.company || sourceMap.company || "");
  const roleTitle = clean(content.metadata?.role_title || sourceMap.role_title || "");
  const lines = [
    `# Cluely Interview Prep - ${company} ${roleTitle}`.trim(),
    "",
    `Generated: ${todayDisplayDate()}`,
    "Setup: Cluely individual mode / Customize Cluely file upload",
    "Use: practice, mock interviews, or explicitly permitted notes only",
    "Style: hybrid exact - short verbatim scripts plus fast memory cues",
    "",
    "IMPORTANT BEHAVIOR:",
    "- Use EXACT SCRIPT only when a question clearly matches the section's TRIGGER PHRASES.",
    `- Keep the first answer ${DEFAULT_SCRIPT_MAX_WORDS} words max unless the source marks it as CORE_NARRATIVE or FUNDAMENTAL_STORY.`,
    "- Use 2-5 speakable bullets with a clear structure: High-level answer, Proof/details, and a concise bridge back to the role.",
    "- Use STAR bullets only for behavioral-story answers or proof-story follow-ups, not for every answer.",
    "- If the interviewer asks for more detail, then expand from FAST CUES and SOURCE FACTS in a follow-up answer.",
    "- If the match is weak, use FAST CUES and SOURCE FACTS instead of inventing.",
    "- Do not invent facts, metrics, employers, titles, tools, credentials, or outcomes.",
    "- Use SECTION IDs privately for matching; do not display them unless Stephanie asks to debug routing.",
    "",
    "## Source Guardrails",
    "",
    ...sourceGuardrails(content, sourceMap),
    ""
  ];

  for (const item of sections) {
    lines.push(
      `## ${item.id} - ${item.title}`,
      "",
      "TRIGGER PHRASES:",
      ...item.triggers.map((trigger) => `- ${trigger}`),
      "",
      "EXACT SCRIPT:",
      item.script,
      "",
      "FAST CUES:",
      ...item.cues.map((cue) => `- ${cue}`),
      "",
      "SOURCE FACTS:",
      ...item.facts.map((fact) => `- ${fact}`),
      ""
    );
  }

  if (sourceAnchors.length) {
    lines.push(
      "## Source Script Anchors Used",
      "",
      ...sourceAnchors.map((anchor) => `- ${anchor.id} (${anchor.topic}): ${anchor.script}`),
      ""
    );
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

function sourceGuardrails(content, sourceMap) {
  const claims = (sourceMap.selected_claims || []).slice(0, 8).map((claim) => `- ${claim.id}: ${claim.text}`);
  const metrics = (sourceMap.selected_metrics || []).map((metric) => `- ${metric.id}: ${metric.label} ${metric.description}`);
  const skills = (sourceMap.selected_resume_skills || content.resume?.skills || []).slice(0, 5).map((skill) => `- ${skill}`);
  return ["Selected claims:", ...claims, "", "Approved metrics:", ...metrics, "", "Relevant skill language:", ...skills];
}

function renderModePrompt(options = {}) {
  const documentName = typeof options === "string" ? options : (options.documentName || "interview prep document");
  if (options.guide) return renderGuideModePrompt(options.guide, documentName);
  return `You are Stephanie's interview prep assistant. Use the uploaded ${documentName} as the source of truth.

When the interviewer asks a question:
1. Match the question to the closest section or route by TRIGGER PHRASES.
2. If an EXACT SCRIPT or SCRIPT exists and the match is strong, return only the speakable answer from that script, unchanged except for bullet formatting, capped at ${DEFAULT_SCRIPT_MAX_WORDS} words unless marked CORE_NARRATIVE or FUNDAMENTAL_STORY.
3. If no exact script matches, return short grounded talking points from the document. Do not invent facts, metrics, employers, titles, tools, credentials, or outcomes.
4. Keep Stephanie's voice warm, direct, senior, and specific.
5. Use 2-5 speakable bullets with labels such as High-level answer, Proof/details, STAR, or Role bridge.
6. Use STAR only for behavioral-story answers or proof-story follow-ups; otherwise use direct framework, plan, question, close, or bridge bullets.
7. Prefer memory-jogging over long generated answers. Expand only if the interviewer asks for more detail.
8. If the interviewer asks about pushing back on a stakeholder request, sales request, one-off client request, requested provider portal, or feature request not aligned with product strategy, prefer a STAKEHOLDER_PUSHBACK route when present. That route should use the Health Summary Report / provider-portal request story, not the broad platform rebuild, platform-transition weakness, coworker conflict, engineering pushback, or technical-debt story.
9. If the question asks for unsupported, confidential, compensation, legal, medical, or invented details, say: No prepared answer found.
10. Do not show SECTION, ROUTE, SCRIPT, CUES, source facts, match mode, route IDs, or debug notes unless Stephanie explicitly asks to debug routing.
`;
}

function renderGuideModePrompt(guide, documentName) {
  const target = clean((guide.title || [guide.company, guide.roleTitle].filter(Boolean).join(" ") || "this role").replace(/\binterview guide\b/ig, ""));
  const fileLabel = documentName === "answer-router text file" ? "`cluely-answer-router.txt`" : `the uploaded ${documentName}`;
  const routingPrecedence = (guide.routingPrecedence?.length ? guide.routingPrecedence : ["Exact question and trigger matches outrank broad thematic matches."])
    .map((item) => `- ${item}`)
    .join("\n");
  const directAnswerPrecedence = buildDirectAnswerPrecedence(guide.sections).join("\n");
  const routeIndex = (guide.routeIndex?.length ? guide.routeIndex : guide.sections.map((item) => `${item.route}: ${item.question}`))
    .map((item) => `- ${item}`)
    .join("\n");

  return `You are Stephanie's ${target} Cluely answer router for practice interviews, mock interviews, or explicitly permitted notes.

Use ${fileLabel} as source of truth. Source guide: ${guide.sourceGuidePath || ""}

Visible output:
- Return only the matched answer as 2-5 speakable bullets.
- Use visible labels that make the answer skimmable: High-level answer, Proof/details, STAR, Role bridge, Plan, Question, or Close.
- Every answer should include a high-level answer bullet and, when available, one proof/details bullet.
- For BEHAVIORAL_STORY routes, use STAR or natural STAR bullets: situation/task, action, result, and role bridge when useful.
- Do not force STAR for positioning, framework, plan, questions, or close routes.

Do not show labels like SECTION, ROUTE, SCRIPT, CUES, DEPTH, SOURCE FACTS, match mode, or repeat risk unless Stephanie explicitly asks to debug routing.

Routing rules:
1. Match QUESTION/TRIGGERS first; choose the narrowest specific route.
2. Use the uploaded file's priority notes when routes compete.
3. Avoid repeating the prior route unless the new question truly asks the same thing.
4. For follow-ups or mid-story support, expand from CUES/DEPTH/SOURCE FACTS as 2-4 bullets instead of front-loading detail.
5. If unsupported, confidential, legal, medical, compensation, or invented: No prepared answer found.
6. Use route names and IDs only inside your private matching process. They must never appear in the visible answer.

Answer-type rules:
${ANSWER_TYPE_DESCRIPTIONS.map((line) => `- ${line}`).join("\n")}
- Do not force STAR across every answer. Use STAR only for BEHAVIORAL_STORY routes or optional proof-story follow-ups.

Routing precedence:
${routingPrecedence}

Direct-answer precedence:
${directAnswerPrecedence}

Route index:
${routeIndex}

Anti-repeat:
- Do not route by broad story familiarity, company name, or theme.
- If two routes share a story, choose by the requested action.
- Do not answer narrow AI, metrics, privacy, integration, or tradeoff questions with broad fit/background routes.

Voice:
- Warm, off-the-cuff, professional, precise, senior.
- Keep the SCRIPT's natural phrasing and contractions, but it is okay to split it into bullets for readability.
- Never invent facts, metrics, employers, roles, dates, credentials, tools, implementation details, or outcomes.
- Do not add new stories; use CUES or backup story cues if asked for another example.

Story reuse:
- Track used stories in-session.
- If reuse creates risk and a specific unused route also matches, reroute.
- If reuse is still correct, use the matched answer but do not display repeat-risk labels unless asked to debug.

Do not output route names, route IDs, section labels, route index, source facts, word count, match mode, repeat risk, or debug notes unless Stephanie asks to debug routing.
`;
}

function buildDirectAnswerPrecedence(sections) {
  const out = sections.map((item) => {
    const question = item.question || item.route;
    const questionNorm = normalizeText(question);
    const triggers = unique(item.triggers.filter((trigger) => normalizeText(trigger) && normalizeText(trigger) !== questionNorm)).slice(0, 4).join(" / ");
    return `- ${item.route}: ${question}${triggers ? ` | ${triggers}` : ""}`;
  });
  return out.length ? out : ["- Use the route QUESTION and TRIGGERS to choose the narrowest matching route."];
}

function runRetrievalSimulation(sections, testQuestions = DEFAULT_TEST_QUESTIONS) {
  const results = testQuestions.map(([expected, question]) => {
    const match = matchQuestion(question, sections);
    const actual = match?.section?.id || "NONE";
    return {
      question,
      expected_section: expected,
      actual_section: actual,
      score: match?.score || 0,
      passed: actual === expected
    };
  });
  const passedCount = results.filter((result) => result.passed).length;
  return {
    passed: passedCount === results.length,
    passed_count: passedCount,
    test_count: results.length,
    results
  };
}

function renderSimulationReport(output) {
  const target = clean([output.company, output.role_title].filter(Boolean).join(" "));
  const rows = output.simulation.results.map((result) => `| ${result.passed ? "PASS" : "FAIL"} | ${escapeTable(result.question)} | ${result.expected_section} | ${result.actual_section} | ${result.score} |`);
  const warnings = [
    ...output.validation.warnings.map((warning) => `- WARNING: ${warning}`),
    ...output.validation.errors.map((error) => `- ERROR: ${error}`)
  ];
  return [
    `# Cluely Retrieval Simulation${target ? ` - ${target}` : ""}`,
    "",
    `Generated: ${output.generated_on}`,
    `Result: ${output.simulation.passed ? "PASS" : "FAIL"} (${output.simulation.passed_count}/${output.simulation.test_count})`,
    "",
    "| Status | Question | Expected | Actual | Score |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Validation",
    "",
    `Exact script check: ${output.validation.passed ? "PASS" : "FAIL"}`,
    ...(warnings.length ? warnings : ["- No unsupported metric patterns found in exact scripts."]),
    ""
  ].join("\n");
}

function validateExactScripts(sections, sourceMap) {
  const sourceText = [
    ...(sourceMap.selected_claims || []).map((claim) => claim.text),
    ...(sourceMap.selected_metrics || []).map((metric) => `${metric.label} ${metric.description}`)
  ].join("\n").toLowerCase();
  const warnings = [];
  const errors = [];
  for (const item of sections) {
    for (const token of metricLikeTokens(item.script)) {
      if (sourceText.includes(token.toLowerCase())) continue;
      warnings.push(`${item.id} uses metric-like token '${token}' that was not found in selected source facts.`);
    }
  }
  return { passed: errors.length === 0, warnings, errors };
}

function matchQuestion(question, sections) {
  const protectedQuestion = normalizeText(question);
  if (hasAny(protectedQuestion, ["compensation", "salary", "confidential", "soc 2", "rust kernel", "legal advice", "medical advice"])) return null;
  const queryTokens = tokenSet(question);
  let best = null;
  for (const item of sections) {
    const haystack = [item.id, item.title, item.route, item.section, item.question, ...item.triggers, ...item.cues].join(" ");
    const targetTokens = tokenSet(haystack);
    const overlap = [...queryTokens].filter((token) => targetTokens.has(token)).length;
    const phraseBonus = item.triggers.some((trigger) => protectedQuestion.includes(normalizeText(trigger))) ? 4 : 0;
    const score = overlap + phraseBonus;
    if (!best || score > best.score) best = { section: item, score };
  }
  return best && best.score >= 2 ? best : null;
}

function tokenSet(text) {
  return new Set(normalizeText(text).split(/\s+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function filterClaims(claims, keywords) {
  return (claims || []).filter((claim) => hasAny(normalizeText(claim.text), keywords));
}

function claimText(claims, keywords) {
  return filterClaims(claims, keywords)[0]?.text || "";
}

function sourceFacts(claims, metricFacts) {
  return [
    ...(claims || []).map((claim) => `${claim.id}: ${claim.text}`),
    ...(metricFacts || []).map((fact) => `${fact.id}: ${fact.text}`)
  ];
}

function compactFacts(values) {
  return unique(values.flatMap((value) => Array.isArray(value) ? value : (value ? [value] : []))).slice(0, 6);
}

function formatMetricFacts(metrics) {
  return (metrics || []).map((metric) => ({ id: metric.id, text: `${metric.label} ${metric.description}`.trim() }));
}

function firstParagraph(paragraphs) {
  return Array.isArray(paragraphs) ? clean(paragraphs.find(Boolean) || "") : "";
}

function sentenceList(values, maxItems) {
  if (!Array.isArray(values)) return "";
  const selected = unique(values).map(clean).filter(Boolean).slice(0, maxItems);
  if (!selected.length) return "";
  if (selected.length === 1) return selected[0];
  return `${selected.slice(0, -1).join(", ")} and ${selected[selected.length - 1]}`;
}

function metricLikeTokens(text) {
  return unique(String(text || "").match(/\$\s?\d[\d,]*(?:\.\d+)?\s?[KMB]?\b|\b\d+(?:\.\d+)?%|\bNPS(?:\s+of)?\s+\d+\b|\b\d+(?:\.\d+)?x\b|\b\d+\+\b/gim) || [])
    .map((token) => clean(token));
}

async function resolveInputFile(inputPath, packageDir) {
  const candidates = unique([
    resolveHome(inputPath),
    path.resolve(process.cwd(), inputPath),
    path.resolve(packageDir, inputPath)
  ]);
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  throw new Error(`Missing source script: ${candidates.join(" or ")}`);
}

async function listSubdirectories(rootDir) {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(rootDir, entry.name));
  } catch {
    return [];
  }
}

async function hasCluelyArtifacts(dir) {
  for (const fileName of CLUELY_ARTIFACT_NAMES) {
    if (await pathExists(path.join(dir, fileName))) return true;
  }
  return false;
}

function warnIfNonDevOutput(outputDir) {
  if (!outputDir || isInsideDev(outputDir)) return;
  console.error(`Ignoring non-Dev --output-dir for Cluely artifacts: ${outputDir}`);
  console.error(`Cluely artifacts are written under ${DEV_ROOT} so existing packages stay canonical.`);
}

function isInsideDev(filePath) {
  const resolved = path.resolve(filePath || "");
  const relative = path.relative(DEV_ROOT, resolved);
  return resolved === DEV_ROOT || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function tokenOverlapScore(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

function safeFolderName(text) {
  return clean(text)
    .replace(/\binterview guide\b/ig, "")
    .replace(/[/:\\]+/g, " - ")
    .replace(/[^A-Za-z0-9 .,&()_-]+/g, "")
    .replace(/\s+/g, " ")
    .trim() || "Cluely Interview Package";
}

function resolveHome(value) {
  const text = String(value || "");
  if (text === "~") return os.homedir();
  if (text.startsWith("~/")) return path.join(os.homedir(), text.slice(2));
  return path.resolve(text);
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function writeText(filePath, text) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, text, "utf8");
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function cleanScript(text) {
  return clean(text).replace(/^["\u201c]|["\u201d]$/g, "").trim();
}

function clean(text) {
  return String(text || "").replaceAll("\u2014", "-").replaceAll("\u2013", "-").replace(/\s+/g, " ").trim();
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9%+]+/g, " ").trim();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => {
    const normalized = normalizeText(keyword);
    return normalized && text.includes(normalized);
  });
}

function wordCount(text) {
  return clean(text).split(/\s+/).filter(Boolean).length;
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function camelCase(text) {
  return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function todayDisplayDate() {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function escapeTable(text) {
  return String(text || "").replaceAll("|", "\\|");
}
