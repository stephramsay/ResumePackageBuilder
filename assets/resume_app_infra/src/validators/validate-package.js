import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { resolveGaMeasurementId } from "../config/analytics.js";
import { loadSourceLibrary } from "../config/source-library.js";
import { pathExists, readJson, readText, writeJson, writeText } from "../lib/files.js";
import {
  findMetricOutcomeBoldIssues,
  formatMetricOutcomeBoldIssues,
  metricOutcomeSpans,
  splitMetricOutcomeSegments
} from "../lib/metric-outcome-bolding.js";
import { assertPackageDirInsideRoot, defaultOutputRoot, isInsidePackageDir, packagePaths } from "../lib/package.js";
import {
  findResumeBulletDistinctnessIssues,
  formatResumeBulletDistinctnessIssues
} from "../lib/resume-bullet-distinctness.js";
import { escapeHtml } from "../lib/strings.js";

const BLOCKED_METRIC_CONFLICTS = [
  {
    label: "67% engagement increase",
    pattern: /\b(?:67%\s+(?:participant|patient)?\s*engagement|engagement\s+(?:increase(?:d)?|by)\s+67%|increasing\s+(?:participant|patient)\s+engagement\s+by\s+67%)\b/i
  },
  {
    label: "96% patient engagement increase",
    pattern: /\b(?:96%\s+(?:patient|participant)?\s*engagement|(?:patient|participant)\s+engagement\s+(?:increase(?:d)?|by)\s+96%|increasing\s+(?:patient|participant)\s+engagement\s+by\s+96%)\b/i
  },
  {
    label: "nearly doubled activation",
    pattern: /\bnearly\s+doubl\w*\s+activation(?:\s+rates?)?\b/i
  },
  {
    label: "PMPY cost-savings wording",
    pattern: /\$\s?7(?:,000|k)\s+pmpy|\bpmpy\b/i
  },
  {
    label: "$4,044 diabetes-control metric",
    pattern: /\$\s?4,044\b/i
  },
  {
    label: "30% to 40% Starlight intake metric",
    pattern: /\b30%\s*(?:->|to)\s*40%\b|\b30%\s+(?:conversion\s+)?improvement\b/i
  },
  {
    label: "77% to 95% satisfaction metric",
    pattern: /\b77%\s*(?:->|to)\s*95%\b|\b95%\s+(?:patient|participant)\s+satisfaction\b/i
  },
  {
    label: "5-user discovery cadence",
    pattern: /\b(?:5\s+users?\s+(?:per\s+week|a\s+week)|5\/week|5\s+user\s+interviews?)\b/i
  },
  {
    label: "4-month mobile app timeline",
    pattern: /\b(?:4|four)\s+months?\b/i
  },
  {
    label: "68% to 84% app satisfaction baseline",
    pattern: /\b68%\s*(?:->|to)\s*84%\b/i
  },
  {
    label: "25% mobile support reduction",
    pattern: /\b(?:tech\s+support|support\s+(?:cases?|tickets?))\b.{0,80}\b25%\b|\b25%\b.{0,80}\b(?:tech\s+support|support\s+(?:cases?|tickets?))\b/i
  },
  {
    label: "tens of thousands infrastructure savings",
    pattern: /\btens\s+of\s+thousands\b/i
  }
];

export async function validatePackage(packageDir, options = {}) {
  const sourceLibrary = await loadSourceLibrary(options.rootDir ?? process.cwd());
  const content = await readJson(path.join(packageDir, "approved-content.json"));
  const paths = packagePaths(packageDir, content);
  const checks = [];

  checkPackageRoot(checks, packageDir, paths);
  await checkRequiredFiles(checks, paths);
  checkApprovedContentShape(checks, content);
  await checkHtml(checks, paths.indexHtml, content);
  await checkAtsResumeHtml(checks, paths.atsHtml, content);
  await checkDocx(checks, paths.atsDocx, { kind: "ATS resume", requireReadMore: true, publicUrl: content.metadata.public_url });
  await checkDocx(checks, paths.coverDocx, { kind: "cover letter", requireReadMore: false });
  await checkPdf(checks, paths.websitePdf, { kind: "website PDF", requireLongPage: true, requiredText: ["Stephanie Ramsay", "Cover Letter", "Executive Resume", "Type 7"] });
  await checkPdf(checks, paths.atsPdf, { kind: "ATS PDF", requiredText: ["SUMMARY", "EXPERIENCE", "SKILLS", "EDUCATION", "Read more about me"] });
  await checkPdf(checks, paths.coverPdf, { kind: "cover letter PDF", requiredText: [content.metadata.company, content.metadata.role_title] });
  await checkAtsParseReport(checks, packageDir, paths, content);
  await checkContentRules(checks, packageDir, paths, content, sourceLibrary);
  await checkCompactGeneratedReports(checks, packageDir);

  const passed = checks.every((check) => check.status === "pass");
  const summary = renderSummary({ checks, passed, content, paths });
  await writeText(path.join(packageDir, "verification-summary.md"), summary);
  return { passed, checks, summary };
}

async function checkCompactGeneratedReports(checks, packageDir) {
  const files = [
    path.join(packageDir, "verification-summary.md"),
    path.join(packageDir, "strategic-alignment.md")
  ];
  let text = "";
  for (const filePath of files) {
    if (await pathExists(filePath)) text += `\n${await readText(filePath)}`;
  }
  const forbidden = [
    "<!doctype html",
    "\"approved-content\"",
    "\"source-map\"",
    "word/document.xml",
    "job_description:"
  ];
  addCheck(
    checks,
    "output.normal_compact",
    "Normal reports avoid dumping full generated/source artifacts",
    forbidden.every((fragment) => !text.toLowerCase().includes(fragment))
  );
  addCheck(
    checks,
    "output.verbose_available",
    "Verbose/debug output is available through explicit JSON flags",
    true,
    "validate --json, status --json, publish --json/--verbose"
  );
}

function checkPackageRoot(checks, packageDir, paths) {
  let insideRoot = false;
  try {
    assertPackageDirInsideRoot(packageDir);
    insideRoot = true;
  } catch {
    insideRoot = false;
  }
  addCheck(checks, "paths.package_root", "Package is inside ~/Dev/resume_packages", insideRoot, defaultOutputRoot());
  const generatedPaths = Object.entries(paths)
    .filter(([key]) => key !== "renderDir")
    .map(([, filePath]) => filePath);
  addCheck(
    checks,
    "paths.generated_inside_package",
    "Generated package outputs stay inside the package folder",
    generatedPaths.every((filePath) => isInsidePackageDir(filePath, packageDir)),
    packageDir
  );
}

function checkApprovedContentShape(checks, content) {
  addCheck(checks, "schema.metadata", "Approved content has metadata", Boolean(content.metadata?.company && content.metadata?.role_title && content.metadata?.slug));
  addCheck(checks, "schema.positioning", "Approved content has positioning", Boolean(content.positioning?.hero_subtitle && content.positioning?.resume_headline));
  addCheck(checks, "schema.claim_ids", "Approved content has selected claim IDs", Array.isArray(content.selected_claim_ids));
  addCheck(checks, "schema.metric_ids", "Approved content has selected metric IDs", Array.isArray(content.selected_metric_ids));
  addCheck(checks, "schema.resume", "Approved content has resume sections", Boolean(content.resume?.summary && Array.isArray(content.resume?.roles) && Array.isArray(content.resume?.skills)));
  addCheck(checks, "schema.cover_letter", "Approved content has cover letter paragraphs", Array.isArray(content.cover_letter?.paragraphs) && content.cover_letter.paragraphs.length >= 3);
  addCheck(checks, "schema.operating_work", "Approved content has operating work cards", Array.isArray(content.operating_work) && content.operating_work.length >= 2);
}

async function checkRequiredFiles(checks, paths) {
  for (const [key, filePath] of Object.entries(paths)) {
    if (key === "renderDir") continue;
    checks.push({
      id: `file.${key}`,
      label: `${key} exists`,
      status: await pathExists(filePath) ? "pass" : "fail",
      detail: filePath
    });
  }
}

async function checkHtml(checks, htmlPath, content) {
  if (!await pathExists(htmlPath)) return;
  const html = await readText(htmlPath);
  const requiredIds = ["cover", "resume", "operating-work", "leadership-style"];
  for (const id of requiredIds) {
    addCheck(checks, `html.section.${id}`, `HTML has #${id}`, html.includes(`id="${id}"`));
  }
  addCheck(checks, "html.nav.cover", "HTML has Cover Letter navigation", html.includes('href="#cover"'));
  addCheck(checks, "html.pdf.inline_header", "HTML has PDF-only inline header", html.includes("pdf-inline-header"));
  addCheck(checks, "html.pdf.bottom_links", "HTML has PDF-only bottom links", html.includes("pdf-bottom-links"));
  addCheck(checks, "html.print.button", "HTML has print button", html.includes("Print or Save as PDF"));
  addCheck(checks, "html.no_live_packet", "HTML excludes Live Packet text", !html.includes("Live Packet"));
  addCheck(checks, "html.no_em_dash", "HTML excludes em dashes", !html.includes("—"));
  addCheck(checks, "html.slug.public_url", "HTML contains public portfolio URL", html.includes(content.metadata.public_url) || html.includes("stephanieramsay.com"));
  const gaMeasurementId = resolveGaMeasurementId();
  addCheck(
    checks,
    "html.analytics.google_tag",
    "HTML includes GA4 Google tag",
    html.includes(`googletagmanager.com/gtag/js?id=${gaMeasurementId}`) && html.includes(`gtag('config', '${gaMeasurementId}'`)
  );
  addCheck(
    checks,
    "html.analytics.page_fields",
    "GA4 page view sends explicit page fields",
    html.includes("page_title: document.title") && html.includes("page_location: window.location.href") && html.includes("page_path: window.location.pathname")
  );
}

async function checkAtsResumeHtml(checks, atsHtmlPath, content) {
  if (!await pathExists(atsHtmlPath)) return;
  const html = await readText(atsHtmlPath);
  const visibleText = stripTags(htmlToVisibleText(html));
  const headerMatch = html.match(/<body>[\s\S]*?<h2>SUMMARY<\/h2>/i);
  const headerText = stripTags(htmlToVisibleText(headerMatch?.[0] ?? ""));
  const domainCount = countPortfolioDomainReferences(visibleText);
  const readMoreHtml = html.match(/<p class="read-more">[\s\S]*?<\/p>/i)?.[0] ?? "";
  const readMoreHasPublicUrl = readMoreHtml.includes("Read more about me:") && readMoreHtml.includes(content.metadata.public_url);
  addCheck(
    checks,
    "html.ats.header_no_portfolio",
    "ATS resume header excludes portfolio website",
    !portfolioDomainPattern().test(headerText),
    headerText.replace(/\s+/g, " ").trim()
  );
  addCheck(
    checks,
    "html.ats.portfolio_only_in_read_more",
    "ATS resume keeps stephanieramsay.com only in Read more summary link",
    domainCount === 1 && readMoreHasPublicUrl,
    `${domainCount} stephanieramsay.com reference(s)`
  );
}

async function checkDocx(checks, docxPath, config) {
  if (!await pathExists(docxPath)) return;
  const zip = await JSZip.loadAsync(await fs.readFile(docxPath));
  const documentXml = await zip.file("word/document.xml").async("string");
  const relsXml = zip.file("word/_rels/document.xml.rels")
    ? await zip.file("word/_rels/document.xml.rels").async("string")
    : "";
  const stylesXml = zip.file("word/styles.xml")
    ? await zip.file("word/styles.xml").async("string")
    : "";
  const fullXml = `${documentXml}\n${stylesXml}`;

  addCheck(checks, `docx.${config.kind}.no_tables`, `${config.kind} DOCX has no tables`, !documentXml.includes("<w:tbl"));
  addCheck(checks, `docx.${config.kind}.no_drawings`, `${config.kind} DOCX has no drawings`, !documentXml.includes("<w:drawing"));
  addCheck(checks, `docx.${config.kind}.no_textboxes`, `${config.kind} DOCX has no text boxes`, !documentXml.includes("txbxContent"));
  addCheck(checks, `docx.${config.kind}.font`, `${config.kind} DOCX uses Work Sans`, fullXml.includes("Work Sans"));
  addCheck(checks, `docx.${config.kind}.teal`, `${config.kind} DOCX has #004747 heading color`, fullXml.includes("004747"));
  addCheck(checks, `docx.${config.kind}.accent`, `${config.kind} DOCX has #800040 accent line`, fullXml.includes("800040"));
  addCheck(checks, `docx.${config.kind}.no_em_dash`, `${config.kind} DOCX excludes em dashes`, !documentXml.includes("—"));

  if (config.requireReadMore) {
    addCheck(checks, "docx.ats.read_more_label", "ATS DOCX has exact Read more about me label", documentXml.includes("Read more about me: "));
    addCheck(checks, "docx.ats.read_more_link", "ATS DOCX hyperlinks only the role URL", relsXml.includes(config.publicUrl));
  }
}

async function checkPdf(checks, pdfPath, config) {
  if (!await pathExists(pdfPath)) return;
  let pdf;
  try {
    const data = new Uint8Array(await fs.readFile(pdfPath));
    pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  } catch (error) {
    checks.push({ id: `pdf.${config.kind}.readable`, label: `${config.kind} is readable`, status: "fail", detail: error.message });
    return;
  }

  let text = "";
  let linkCount = 0;
  let firstPageViewport = null;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    if (pageNumber === 1) firstPageViewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    text += `\n${content.items.map((item) => item.str).join(" ")}`;
    const annotations = await page.getAnnotations();
    linkCount += annotations.filter((annotation) => annotation.url).length;
  }

  addCheck(checks, `pdf.${config.kind}.exists_pages`, `${config.kind} has pages`, pdf.numPages > 0, `${pdf.numPages} pages`);
  addCheck(checks, `pdf.${config.kind}.links`, `${config.kind} has clickable links`, linkCount > 0, `${linkCount} links`);
  if (config.requireLongPage && firstPageViewport) {
    addCheck(checks, `pdf.${config.kind}.long_page`, `${config.kind} uses long-page print layout`, firstPageViewport.height > 2000, `${Math.round(firstPageViewport.width)} x ${Math.round(firstPageViewport.height)} pt`);
  }
  for (const required of config.requiredText ?? []) {
    addCheck(
      checks,
      `pdf.${config.kind}.text.${required}`,
      `${config.kind} contains ${required}`,
      normalizeForSearch(text).includes(normalizeForSearch(required))
    );
  }
  addCheck(checks, `pdf.${config.kind}.no_live_packet`, `${config.kind} excludes Live Packet text`, !text.includes("Live Packet"));
  addCheck(checks, `pdf.${config.kind}.no_em_dash`, `${config.kind} excludes em dashes`, !text.includes("—"));
}

async function checkAtsParseReport(checks, packageDir, paths, content) {
  if (!await pathExists(paths.atsDocx)) return;

  const docx = await extractDocxReport(paths.atsDocx);
  const pdf = await extractPdfReport(paths.atsPdf);
  const jobDescription = await readOptionalText(path.join(packageDir, "job-description.txt"));
  const keywordCoverage = keywordCoverageReport(jobDescription, docx.text);
  const sectionOrder = sectionOrderReport(docx.text);
  const noPersonalityContent = !/\b(enneagram|type\s+7|type\s+9|enthusiast|peacemaker)\b/i.test(docx.text);
  const exactReadMore = docx.text.includes(`Read more about me: ${content.metadata.public_url}`);
  const exactHyperlink = docx.hyperlink_targets.length === 1 && docx.hyperlink_targets[0] === content.metadata.public_url;
  const headerText = textBeforeSection(docx.text, "SUMMARY");
  const headerNoPortfolio = !portfolioDomainPattern().test(headerText);
  const portfolioDomainReferences = countPortfolioDomainReferences(docx.text);
  const portfolioOnlyInReadMore = portfolioDomainReferences === 1 && exactReadMore;

  const report = {
    generated_at: new Date().toISOString(),
    ats_docx: {
      path: paths.atsDocx,
      word_count: docx.word_count,
      text_chars: docx.text.length,
      section_positions: sectionOrder.positions,
      hyperlink_targets: docx.hyperlink_targets,
      exact_read_more_line: exactReadMore,
      header_has_portfolio_website: !headerNoPortfolio,
      portfolio_domain_references: portfolioDomainReferences,
      no_personality_content: noPersonalityContent
    },
    ats_pdf: pdf,
    keyword_coverage: keywordCoverage
  };
  await writeJson(path.join(packageDir, "ats-parse-report.json"), report);

  addCheck(checks, "ats.parse.docx_text", "ATS DOCX extracts as normal text", docx.word_count >= 350, `${docx.word_count} words`);
  addCheck(checks, "ats.parse.section_order", "ATS DOCX section order is parse-friendly", sectionOrder.in_order, JSON.stringify(sectionOrder.positions));
  addCheck(checks, "ats.parse.read_more_exact", "ATS DOCX has exact readable Read more line", exactReadMore);
  addCheck(checks, "ats.parse.hyperlink_exact", "ATS DOCX has exactly one hyperlink target for the role URL", exactHyperlink, docx.hyperlink_targets.join(", "));
  addCheck(checks, "ats.parse.header_no_portfolio", "ATS DOCX header excludes portfolio website", headerNoPortfolio, headerText.replace(/\s+/g, " ").trim());
  addCheck(checks, "ats.parse.portfolio_only_in_read_more", "ATS DOCX keeps stephanieramsay.com only in Read more summary link", portfolioOnlyInReadMore, `${portfolioDomainReferences} stephanieramsay.com reference(s)`);
  addCheck(checks, "ats.parse.no_personality", "ATS DOCX excludes Enneagram/personality content", noPersonalityContent);
  addCheck(checks, "ats.parse.pdf_pages", "ATS PDF stays within a normal resume page count", pdf.pages > 0 && pdf.pages <= 2, `${pdf.pages} pages`);
  addCheck(
    checks,
    "ats.parse.keyword_coverage",
    "ATS resume covers role-relevant keywords",
    keywordCoverage.total === 0 || keywordCoverage.ratio >= 0.45,
    `${Math.round(keywordCoverage.ratio * 100)}% (${keywordCoverage.covered.length}/${keywordCoverage.total})`
  );
}

async function checkContentRules(checks, packageDir, paths, content, sourceLibrary) {
  const files = [paths.indexHtml, paths.atsHtml, paths.coverHtml].filter(Boolean);
  let text = "";
  for (const filePath of files) {
    if (await pathExists(filePath)) text += `\n${htmlToVisibleText(await readText(filePath))}`;
  }

  addCheck(checks, "content.company", "Generated content references company", text.includes(content.metadata.company));
  addCheck(checks, "content.role", "Generated content references role", text.includes(content.metadata.role_title));
  addCheck(checks, "content.title_exact", "Chief Experience Officer title appears exactly", text.includes("Chief Experience Officer"));
  addCheck(checks, "content.no_appended_cxo_title", "Chief Experience Officer is not appended with descriptors", !hasChiefExperienceOfficerDescriptor(stripTags(text)));
  addCheck(checks, "content.starlight_kannact_separate", "Starlight and Kannact remain separate", text.includes("Starlight") && text.includes("Kannact"));
  addCheck(checks, "content.ucsf_override", "UCSF employer override is followed", text.includes("University of California, San Francisco") && !text.includes("The WISDOM Study, UCSF"));
  addCheck(checks, "content.no_em_dash", "Generated content excludes em dashes", !text.includes("—"));
  addCheck(checks, "content.no_live_packet", "Generated content excludes Live Packet", !text.includes("Live Packet"));
  addCheck(checks, "content.metrics_approved", "Selected metric IDs are approved", (content.selected_metric_ids ?? []).every((id) => sourceLibrary.metricById.has(id)));
  addCheck(checks, "content.claims_approved", "Selected claim IDs are approved", (content.selected_claim_ids ?? []).every((id) => sourceLibrary.claimById.has(id)));
  addCheck(checks, "content.source_map_claims", "Source map contains every selected claim", await sourceMapContainsSelectedClaims(packageDir, content));
  addCheck(checks, "content.source_map_metrics", "Source map contains every selected metric", await sourceMapContainsSelectedMetrics(packageDir, content));
  const unsupportedMetrics = findUnsupportedMetrics(stripTags(text), content, sourceLibrary);
  addCheck(checks, "content.no_unsupported_metrics", "Generated content has no unsupported metric-like claims", unsupportedMetrics.length === 0, unsupportedMetrics.join(", "));
  const blockedMetricConflicts = findBlockedMetricConflicts(stripTags(text));
  addCheck(checks, "content.no_blocked_metric_conflicts", "Generated content excludes retired/conflicting Stephanie metrics", blockedMetricConflicts.length === 0, blockedMetricConflicts.join(", "));
  checkKannactSatisfactionNpsPlacement(checks, content, sourceLibrary);
  addCheck(checks, "content.package_storage", "Package stores generated files together", isInsidePackageDir(paths.indexHtml, packageDir));
  checkCompanyDescriptors(checks, content, sourceLibrary);
  await checkRoleProgression(checks, paths, content, sourceLibrary);
  checkSeniorResumeQuality(checks, content, sourceLibrary);
  await checkResumeMetricOutcomeBolding(checks, paths, content, sourceLibrary);
  checkCoverLetterQuality(checks, content, sourceLibrary);
  await checkCompanyDescriptorOrder(checks, paths.atsDocx, content);
}

function checkKannactSatisfactionNpsPlacement(checks, content, sourceLibrary) {
  const blockedOutsideBullet = [
    content.resume?.summary,
    content.positioning?.hero_subtitle,
    content.positioning?.resume_headline,
    content.positioning?.side_panel_summary,
    content.positioning?.role_fit_thesis,
    content.positioning?.concern_to_address,
    ...(content.positioning?.side_panel_signals ?? []),
    ...(content.resume?.skills ?? []),
    content.cover_letter?.greeting,
    ...(content.cover_letter?.paragraphs ?? []),
    content.cover_letter?.closing,
    ...(content.operating_work_cards ?? []).flatMap((card) => [card.title, card.body, ...(card.proof_points ?? [])]),
    ...(content.leadership_style_cards ?? []).flatMap((card) => [card.title, card.body])
  ].filter(Boolean).join(" ");
  const metricsStayOutOfNarrative = !/\b(?:NPS(?:\s+of)?\s+82|96%\s+(?:participant|patient)\s+satisfaction)\b/i.test(blockedOutsideBullet);

  const roles = content.resume?.roles ?? [];
  const matchingRoleClaims = roles.flatMap((role) =>
    (role.claims ?? [])
      .map((claimId) => ({ role, claim: sourceLibrary.claimById.get(claimId) }))
      .filter(({ claim }) => claim && /\b(?:NPS(?:\s+of)?\s+82|96%\s+(?:participant|patient)\s+satisfaction)\b/i.test(claim.text ?? ""))
  );
  const onlyKannactBullet = matchingRoleClaims.length === 1 && matchingRoleClaims[0].role.role_id === "role.kannact";

  addCheck(
    checks,
    "content.kannact_satisfaction_nps_single_bullet",
    "96% participant satisfaction and NPS of 82 appear only in one Kannact bullet",
    metricsStayOutOfNarrative && onlyKannactBullet,
    `narrative_clear=${metricsStayOutOfNarrative}; matching_role_bullets=${matchingRoleClaims.length}`
  );
}

async function checkResumeMetricOutcomeBolding(checks, paths, content, sourceLibrary) {
  const preflightIssues = findMetricOutcomeBoldIssues(content, sourceLibrary);
  addCheck(
    checks,
    "resume.metrics.boldable_outcome_phrases",
    "Resume metric bullets have identifiable outcome phrases to bold",
    preflightIssues.length === 0,
    formatMetricOutcomeBoldIssues(preflightIssues)
  );

  const htmlIssues = await findHtmlMetricOutcomeBoldIssues(paths, content, sourceLibrary);
  addCheck(
    checks,
    "resume.metrics.html_bold_outcomes_only",
    "Resume HTML bolds only metric/outcome phrases inside measurable bullets",
    htmlIssues.length === 0,
    htmlIssues.join("; ")
  );

  const docxIssues = await findDocxMetricOutcomeBoldIssues(paths.atsDocx, content, sourceLibrary);
  addCheck(
    checks,
    "resume.metrics.docx_bold_outcomes_only",
    "Resume DOCX bolds only metric/outcome phrases inside measurable bullets",
    docxIssues.length === 0,
    docxIssues.join("; ")
  );
}

function checkCoverLetterQuality(checks, content, sourceLibrary) {
  const paragraphs = content.cover_letter?.paragraphs ?? [];
  const opening = paragraphs[0] ?? "";
  const letterText = [
    content.cover_letter?.greeting,
    ...paragraphs,
    content.cover_letter?.closing
  ].join(" ");
  const normalized = normalizeReadableText(letterText);
  const strategy = content.role_analysis?.cover_letter_strategy ?? {};

  addCheck(
    checks,
    "cover.opening.not_location_auth",
    "Cover letter does not open with location, citizenship, or work authorization",
    !/^\s*(i live|i am based|based in|located in|as a u\.?s\.? citizen|i am authorized|my work authorization|san francisco)\b/i.test(opening)
  );
  addCheck(
    checks,
    "cover.opening.specific",
    "Cover letter opening is specific to the company or role",
    openingIsSpecific(opening, content)
  );
  addCheck(
    checks,
    "cover.why_role",
    "Cover letter includes a clear why-this-role rationale",
    /\b(drew me|drawn|stands out|natural next step|role feels|chance to|care about|matters|work i care)\b/i.test(letterText)
  );
  addCheck(
    checks,
    "cover.strengths.transferable",
    "Cover letter shows transferable strengths without just repeating the resume",
    coverShowsTransferableStrengths(letterText) && !coverRepeatsResume(letterText, content, sourceLibrary)
  );
  addCheck(
    checks,
    "cover.transition_bridge",
    "Cover letter includes transition bridge when role context needs it",
    !strategy.needs_transition_bridge || hasTransitionBridge(letterText)
  );
  addCheck(
    checks,
    "cover.hands_on_bridge",
    "Cover letter includes hands-on positioning when needed",
    !strategy.needs_hands_on_bridge || hasHandsOnBridge(letterText)
  );
  addCheck(
    checks,
    "cover.no_step_down",
    "Cover letter avoids step-down or title-regression language",
    !/\b(step down|stepping down|title regression|regression|downgrade|less senior|taking a step back)\b/i.test(letterText)
  );
  addCheck(
    checks,
    "cover.not_apologetic",
    "Cover letter bridge is not apologetic",
    !/\b(apologize|apologetic|despite my|even though my background|although my background|overqualified|underqualified)\b/i.test(letterText)
  );
  addCheck(
    checks,
    "cover.not_leaving_product",
    "Cover letter does not imply Stephanie is leaving product or changing randomly",
    !/\b(leaving product|moving away from product|escape product|random move|random change|pivot away from product)\b/i.test(letterText)
  );
  addCheck(
    checks,
    "cover.no_generic_ai_phrases",
    "Cover letter avoids generic application phrases",
    !genericCoverPhrases().some((phrase) => normalized.includes(phrase))
  );
  addCheck(
    checks,
    "cover.no_unsupported_auth_size",
    "Cover letter avoids unsupported authorization, citizenship, and company-size claims",
    !/\b(citizen|citizenship|authorized to work|work authorization|visa|sponsorship|under 30|small company|small team)\b/i.test(letterText)
  );
  addCheck(checks, "cover.no_em_dash", "Cover letter excludes em dashes", !letterText.includes("—"));
}

async function findHtmlMetricOutcomeBoldIssues(paths, content, sourceLibrary) {
  const issues = [];
  const htmlTargets = [
    ["ATS HTML", paths.atsHtml],
    ["Landing HTML", paths.indexHtml]
  ];
  const measurableClaims = selectedMeasurableClaims(content, sourceLibrary);
  for (const [label, filePath] of htmlTargets) {
    if (!await pathExists(filePath)) {
      issues.push(`${label}: missing HTML file`);
      continue;
    }
    const html = await readText(filePath);
    for (const claim of measurableClaims) {
      const expected = `<li>${renderExpectedMetricClaimHtml(claim, sourceLibrary)}</li>`;
      if (!html.includes(expected)) {
        issues.push(`${label}: ${claim.id} metric/outcome phrase is not bolded exactly`);
      }
    }
  }
  return issues;
}

async function findDocxMetricOutcomeBoldIssues(docxPath, content, sourceLibrary) {
  if (!await pathExists(docxPath)) return [`Missing ATS DOCX: ${docxPath}`];
  const zip = await JSZip.loadAsync(await fs.readFile(docxPath));
  const documentXml = await zip.file("word/document.xml").async("string");
  const paragraphs = extractDocxParagraphRuns(documentXml);
  const issues = [];

  for (const claim of selectedMeasurableClaims(content, sourceLibrary)) {
    const paragraph = paragraphs.find((item) => item.text.includes(claim.text));
    if (!paragraph) {
      issues.push(`DOCX: ${claim.id} bullet not found`);
      continue;
    }
    const claimStart = paragraph.text.indexOf(claim.text);
    const spans = metricOutcomeSpans(claim.text, claim.metric_ids ?? [], sourceLibrary)
      .map((span) => ({ start: claimStart + span.start, end: claimStart + span.end }));
    const boldAt = boldCharacterMap(paragraph);
    for (const span of spans) {
      for (let index = span.start; index < span.end; index += 1) {
        if (/\S/.test(paragraph.text[index] ?? "") && !boldAt[index]) {
          issues.push(`DOCX: ${claim.id} has unbolded metric/outcome text`);
          break;
        }
      }
    }
    const metricRanges = spans;
    for (let index = claimStart; index < claimStart + claim.text.length; index += 1) {
      if (!boldAt[index] || !/\S/.test(paragraph.text[index] ?? "")) continue;
      const insideMetric = metricRanges.some((span) => index >= span.start && index < span.end);
      if (!insideMetric) {
        issues.push(`DOCX: ${claim.id} bolds non-metric bullet text`);
        break;
      }
    }
  }

  return [...new Set(issues)];
}

function selectedMeasurableClaims(content, sourceLibrary) {
  return (content.resume?.roles ?? [])
    .flatMap((role) => role.claims ?? [])
    .map((id) => sourceLibrary.claimById.get(id))
    .filter((claim) => claim && (claim.metric_ids ?? []).length > 0);
}

function renderExpectedMetricClaimHtml(claim, sourceLibrary) {
  return splitMetricOutcomeSegments(claim.text, claim.metric_ids ?? [], sourceLibrary)
    .map((segment) => segment.bold ? `<strong>${escapeHtml(segment.text)}</strong>` : escapeHtml(segment.text))
    .join("");
}

function extractDocxParagraphRuns(documentXml) {
  return String(documentXml)
    .split(/<\/w:p>/)
    .map((paragraphXml) => {
      const runs = [];
      let text = "";
      for (const runMatch of paragraphXml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)) {
        const runXml = runMatch[0];
        const runText = [...runXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
          .map((match) => decodeXml(match[1]))
          .join("");
        if (!runText) continue;
        const start = text.length;
        text += runText;
        runs.push({
          text: runText,
          bold: runHasEnabledBold(runXml),
          start,
          end: text.length
        });
      }
      return { text, runs };
    })
    .filter((paragraph) => paragraph.text.trim());
}

function runHasEnabledBold(runXml) {
  const boldMatch = String(runXml).match(/<w:b\b([^>]*)\/?>/);
  if (!boldMatch) return false;
  const attrs = boldMatch[1] ?? "";
  return !/\bw:val="(?:false|0)"/i.test(attrs);
}

function boldCharacterMap(paragraph) {
  const out = Array.from({ length: paragraph.text.length }, () => false);
  for (const run of paragraph.runs) {
    if (!run.bold) continue;
    for (let index = run.start; index < run.end; index += 1) out[index] = true;
  }
  return out;
}

function checkSeniorResumeQuality(checks, content, sourceLibrary) {
  const roles = content.resume?.roles ?? [];
  const currentRole = roles.find((role) => role.role_id === "role.starlight") ?? roles[0];
  const currentClaims = claimsForRole(currentRole, sourceLibrary);
  const allClaims = roles.flatMap((role) => claimsForRole(role, sourceLibrary));
  const summary = String(content.resume?.summary ?? "");
  const topThird = [
    summary,
    currentRole?.employer,
    currentRole?.descriptor,
    currentRole?.title,
    ...currentClaims.slice(0, 3).map((claim) => claim.text)
  ].join(" ");

  addCheck(
    checks,
    "senior.current.no_responsible_for",
    "Current-role bullets do not begin with Responsible for",
    currentClaims.every((claim) => !/^\s*responsible for\b/i.test(claim.text))
  );
  addCheck(
    checks,
    "senior.summary.specific",
    "Resume summary is specific and not generic AI-style copy",
    summaryIsSpecific(summary),
    summary.slice(0, 140)
  );
  addCheck(
    checks,
    "senior.summary.first_person",
    "Resume summary is written in first person",
    summaryIsFirstPerson(summary),
    summary.slice(0, 140)
  );
  addCheck(
    checks,
    "senior.summary.outcome_led_human",
    "Resume summary is outcome-led, warm, and human-readable",
    summaryIsOutcomeLedAndHuman(summary),
    summary.slice(0, 180)
  );
  addCheck(
    checks,
    "senior.top_third.proof",
    "Top third includes scope, metric, or strategic impact proof",
    hasProofPoint(topThird)
  );
  addCheck(
    checks,
    "senior.current_role.weight",
    "Current role has the strongest resume weight",
    currentRoleHasStrongestWeight(roles)
  );
  addCheck(
    checks,
    "senior.older_roles.shorter",
    "Older roles are shorter unless unusually relevant",
    olderRolesAreShorter(roles)
  );
  addCheck(
    checks,
    "senior.ucsf.minimum_bullet",
    "UCSF role includes at least one resume bullet",
    (roles.find((role) => role.role_id === "role.ucsf")?.claims ?? []).length >= 1
  );
  addCheck(
    checks,
    "senior.ucsf.single_bullet_release_cycles",
    "Single UCSF resume bullet uses the 30+ release cycles proof point",
    singleUcsfBulletUsesReleaseCycles(roles)
  );
  addCheck(
    checks,
    "senior.skills.not_basic_tools",
    "Skills section is not mostly basic tools",
    skillsNotMostlyBasicTools(content.resume?.skills ?? [])
  );
  addCheck(
    checks,
    "senior.bullets.varied",
    "Resume bullet patterns are varied",
    bulletPatternsAreVaried(allClaims.map((claim) => claim.text))
  );
  const bulletDistinctnessIssues = findResumeBulletDistinctnessIssues(content, sourceLibrary);
  addCheck(
    checks,
    "senior.bullets.distinct_purpose_by_company",
    "Resume bullets under each company serve distinct purposes",
    bulletDistinctnessIssues.length === 0,
    formatResumeBulletDistinctnessIssues(bulletDistinctnessIssues)
  );
  addCheck(
    checks,
    "senior.bullets.outcomes_first",
    "Outcome bullets appear first within each role",
    outcomeBulletsAppearFirst(roles, sourceLibrary)
  );
  const presentTenseOffenders = barePresentTenseBulletStarts(allClaims.map((claim) => claim.text));
  addCheck(
    checks,
    "senior.bullets.present_tense_third_person",
    "Present-tense resume bullets use third-person singular verbs",
    presentTenseOffenders.length === 0,
    presentTenseOffenders.join("; ")
  );
  addCheck(
    checks,
    "senior.bullets.leadership_signal",
    "Bullets signal ownership, judgment, strategy, systems, or cross-functional influence",
    currentClaims.filter((claim) => hasSeniorLeadershipSignal(claim.text)).length >= Math.min(3, currentClaims.length)
  );
}

function checkCompanyDescriptors(checks, content, sourceLibrary) {
  const roles = content.resume?.roles ?? [];
  const descriptors = roles.map((role) => String(role.descriptor ?? "").trim());
  addCheck(
    checks,
    "content.company_descriptions.present",
    "Each work experience entry includes a company/program description",
    descriptors.length > 0 && descriptors.every(Boolean)
  );
  addCheck(
    checks,
    "content.company_descriptions.concise",
    "Company/program descriptions are concise one-line entries",
    descriptors.every((descriptor) => !descriptor.includes("\n") && descriptor.length <= 240)
  );
  const sourceBacked = roles.every((role) => {
    const sourceRole = sourceLibrary.roleById.get(role.role_id);
    return sourceRole && normalizeDescriptor(role.descriptor) === normalizeDescriptor(sourceRole.descriptor);
  });
  addCheck(
    checks,
    "content.company_descriptions.source_backed",
    "Company/program descriptions match source-backed role descriptors",
    sourceBacked
  );
}

async function checkRoleProgression(checks, paths, content, sourceLibrary) {
  const expectedRoles = (sourceLibrary.roles ?? [])
    .filter((role) => ["role.starlight", "role.kannact", "role.ucsf"].includes(role.id))
    .filter((role) => (role.subroles ?? []).length > 0);
  const contentRolesById = new Map((content.resume?.roles ?? []).map((role) => [role.role_id, role]));

  const missingFromContent = [];
  for (const sourceRole of expectedRoles) {
    const contentRole = contentRolesById.get(sourceRole.id);
    if (!contentRole) {
      missingFromContent.push(sourceRole.employer);
      continue;
    }
    for (const subrole of sourceRole.subroles ?? []) {
      const hasMatch = (contentRole.subroles ?? []).some((item) => (
        normalizeDescriptor(item.title) === normalizeDescriptor(subrole.title)
        && normalizeDescriptor(item.dates) === normalizeDescriptor(subrole.dates)
      ));
      if (!hasMatch) missingFromContent.push(`${sourceRole.employer}: ${subrole.title} ${subrole.dates}`);
    }
  }

  addCheck(
    checks,
    "content.role_progression.source_backed",
    "Resume role progression carries source-backed titles and dates",
    missingFromContent.length === 0,
    missingFromContent.join(", ")
  );

  const landingText = await pathExists(paths.indexHtml) ? htmlToVisibleText(await readText(paths.indexHtml)) : "";
  const atsHtmlText = await pathExists(paths.atsHtml) ? htmlToVisibleText(await readText(paths.atsHtml)) : "";
  const missingFromHtml = [
    ...missingRenderedProgression(expectedRoles, landingText).map((item) => `landing ${item}`),
    ...missingRenderedProgression(expectedRoles, atsHtmlText).map((item) => `ATS ${item}`)
  ];
  addCheck(
    checks,
    "content.role_progression.rendered_html",
    "Landing page and ATS HTML render role progression titles and dates",
    missingFromHtml.length === 0,
    missingFromHtml.join(", ")
  );

  try {
    const docx = await extractDocxReport(paths.atsDocx);
    const missingFromDocx = missingRenderedProgression(expectedRoles, docx.text);
    addCheck(
      checks,
      "ats.role_progression.rendered_docx",
      "ATS DOCX renders role progression titles and dates",
      missingFromDocx.length === 0,
      missingFromDocx.join(", ")
    );
  } catch (error) {
    addCheck(checks, "ats.role_progression.rendered_docx", "ATS DOCX renders role progression titles and dates", false, error.message);
  }
}

function missingRenderedProgression(expectedRoles, text) {
  const missing = [];
  for (const role of expectedRoles) {
    for (const subrole of role.subroles ?? []) {
      if (!containsReadableText(text, subrole.title) || !containsReadableText(text, subrole.dates)) {
        missing.push(`${role.employer}: ${subrole.title} ${subrole.dates}`);
      }
    }
  }
  return missing;
}

function containsReadableText(text, phrase) {
  const normalizedText = normalizeReadableText(text);
  const normalizedPhrase = normalizeReadableText(phrase);
  return Boolean(normalizedPhrase && normalizedText.includes(normalizedPhrase));
}

function hasChiefExperienceOfficerDescriptor(text) {
  const matches = [...String(text ?? "").matchAll(/Chief Experience Officer\s*\|\s*([^|\n]+)/g)];
  return matches.some((match) => {
    const suffix = match[1].trim();
    return !/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/|\d{4}|Present\b)/.test(suffix);
  });
}

async function checkCompanyDescriptorOrder(checks, docxPath, content) {
  try {
    const docx = await extractDocxReport(docxPath);
    const orderOk = (content.resume?.roles ?? []).every((role) => {
      const employerAt = docx.text.indexOf(role.employer);
      const descriptorAt = docx.text.indexOf(role.descriptor);
      const titleAt = docx.text.indexOf(role.title);
      return employerAt >= 0 && descriptorAt > employerAt && titleAt > descriptorAt;
    });
    addCheck(
      checks,
      "ats.company_description_order",
      "ATS resume places company/program description between employer/date and title",
      orderOk
    );
  } catch (error) {
    addCheck(checks, "ats.company_description_order", "ATS resume places company/program description between employer/date and title", false, error.message);
  }
}

function addCheck(checks, id, label, condition, detail = "") {
  checks.push({
    id,
    label,
    status: condition ? "pass" : "fail",
    detail
  });
}

function renderSummary({ checks, passed, content, paths }) {
  const rows = checks.map((check) => `- [${check.status === "pass" ? "x" : " "}] ${check.label}${check.detail ? ` (${check.detail})` : ""}`).join("\n");
  return `# Verification Summary

Package: ${content.metadata.company} ${content.metadata.role_title}

Status: ${passed ? "PASS" : "FAIL"}

Public URL: ${content.metadata.public_url}

## Generated Assets

- ${paths.indexHtml}
- ${paths.websitePdf}
- ${paths.atsDocx}
- ${paths.atsPdf}
- ${paths.coverDocx}
- ${paths.coverPdf}

## Checks

${rows}
`;
}

function stripTags(text) {
  return String(text).replace(/<[^>]+>/g, " ");
}

function htmlToVisibleText(text) {
  return String(text)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeForSearch(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function portfolioDomainPattern() {
  return /\bstephanieramsay\.com\b/i;
}

function countPortfolioDomainReferences(text) {
  return [...String(text ?? "").matchAll(/\bstephanieramsay\.com\b/gi)].length;
}

function textBeforeSection(text, section) {
  const lines = String(text ?? "").split(/\n+/);
  const index = lines.findIndex((line) => line.trim().toUpperCase() === section);
  return (index >= 0 ? lines.slice(0, index) : lines).join("\n");
}

function claimsForRole(roleRef, sourceLibrary) {
  if (!roleRef) return [];
  return (roleRef.claims ?? [])
    .map((id) => sourceLibrary.claimById.get(id))
    .filter(Boolean);
}

function summaryIsSpecific(summary) {
  const text = normalizeReadableText(summary);
  if (!text) return false;
  const genericPhrases = [
    "results driven",
    "dynamic professional",
    "seasoned professional",
    "highly motivated",
    "passionate about",
    "proven track record",
    "leveraging my skills",
    "fast paced environment",
    "synergy",
    "innovative solutions"
  ];
  if (genericPhrases.some((phrase) => text.includes(phrase))) return false;
  const signals = [
    "product leader",
    "7 years",
    "healthcare",
    "digital health",
    "platform",
    "roadmap",
    "requirements",
    "workflow",
    "adoption",
    "regulated",
    "cross functional",
    "executive",
    "strategy"
  ];
  return signals.filter((signal) => text.includes(signal)).length >= 4;
}

function summaryIsFirstPerson(summary) {
  const text = normalizeReadableText(summary);
  if (!text) return false;
  const firstPersonSignals = /\b(i am|i bring|i have|i ve|i built|i own|i lead|my work|my best|my strongest)\b/.test(text);
  const thirdPersonLead = /^(healthcare|product|senior|ai|enterprise)\s+product/.test(text)
    || /\b(she|her work|her strongest|spends her|brings a)\b/.test(text);
  return firstPersonSignals && !thirdPersonLead;
}

function summaryIsOutcomeLedAndHuman(summary) {
  const text = normalizeReadableText(summary);
  if (!text) return false;
  const hasOutcome = /\b(\d+%|\d+\+|nps|capacity|conversion|satisfaction|reduced|increased|cut|improved|rebuilt|launched|scaled)\b/.test(text);
  const hasHumanLanguage = /\b(patient|patients|people|care team|care teams|trust|use|understand|stuck|clearer|human|warm|messy)\b/.test(text);
  const buzzwordPile = /\b(strategy, discovery, roadmaps, requirements|product strategy, discovery, roadmap|cross-functional delivery across product, engineering, data)\b/.test(text);
  return hasOutcome && hasHumanLanguage && !buzzwordPile;
}

function openingIsSpecific(opening, content) {
  const text = normalizeReadableText(opening);
  const company = normalizeReadableText(content.metadata?.company ?? "");
  const roleWords = normalizeReadableText(content.metadata?.role_title ?? "").split(/\s+/).filter((word) => word.length > 3);
  if (genericCoverPhrases().some((phrase) => text.includes(phrase))) return false;
  const mentionsCompany = company && text.includes(company);
  const mentionsRole = roleWords.some((word) => text.includes(word));
  const mentionsMeaningfulWork = /\b(workflow|product|healthcare|care|patient|clinical|ai|systems|experience|operations|implementation|data|partner)\b/.test(text);
  return Boolean((mentionsCompany || mentionsRole) && mentionsMeaningfulWork);
}

function coverShowsTransferableStrengths(text) {
  const normalized = normalizeReadableText(text);
  const signals = [
    "product",
    "workflow",
    "patient",
    "healthcare",
    "clinical",
    "ai",
    "operations",
    "user",
    "research",
    "systems",
    "gtm",
    "partner",
    "cross functional",
    "implementation",
    "launch",
    "technical"
  ];
  return signals.filter((signal) => normalized.includes(signal)).length >= 5;
}

function coverRepeatsResume(text, content, sourceLibrary) {
  const normalized = normalizeReadableText(text);
  const selectedClaims = (content.resume?.roles ?? []).flatMap((role) => claimsForRole(role, sourceLibrary));
  let exactishMatches = 0;
  for (const claim of selectedClaims) {
    const excerpt = normalizeReadableText(claim.text).split(/\s+/).slice(0, 12).join(" ");
    if (excerpt && normalized.includes(excerpt)) exactishMatches += 1;
  }
  return exactishMatches > 2;
}

function hasTransitionBridge(text) {
  const normalized = normalizeReadableText(text);
  return /\b(natural next step|thoughtful move|move makes sense|intentional|familiar|not trying to leave product|drawn to|close to product|broader operating judgment)\b/.test(normalized);
}

function hasHandsOnBridge(text) {
  const normalized = normalizeReadableText(text);
  return /\b(hands on|hands-on|chief level title|writing requirements|mapping workflows|supporting launches|close to the product|close to the workflow|people using the product)\b/.test(normalized)
    && /\b(intentional|leadership|product|workflow|team)\b/.test(normalized);
}

function genericCoverPhrases() {
  return [
    "i am excited to apply",
    "my background aligns perfectly",
    "results driven leader",
    "i am writing to express",
    "i believe i would be a great fit",
    "unique blend of skills",
    "fast paced environment",
    "proven track record",
    "i am passionate about leveraging",
    "dear hiring manager i am"
  ];
}

function hasProofPoint(text) {
  const normalized = normalizeReadableText(text);
  return /\b\d/.test(normalized)
    || /\b(enterprise|health system|platform|scale|capacity|conversion|adoption|partner|roadmap|strategy|cross functional|executive|operating model)\b/.test(normalized);
}

function currentRoleHasStrongestWeight(roles) {
  const counts = roleCounts(roles);
  const current = counts.get("role.starlight") ?? 0;
  const olderMax = Math.max(counts.get("role.kannact") ?? 0, counts.get("role.ucsf") ?? 0);
  return current >= 4 && current > olderMax;
}

function olderRolesAreShorter(roles) {
  const counts = roleCounts(roles);
  const current = counts.get("role.starlight") ?? 0;
  const ucsf = counts.get("role.ucsf") ?? 0;
  const kannact = counts.get("role.kannact") ?? 0;
  return ucsf <= 2 && kannact < current;
}

function roleCounts(roles) {
  return new Map((roles ?? []).map((role) => [role.role_id, (role.claims ?? []).length]));
}

function singleUcsfBulletUsesReleaseCycles(roles) {
  const claims = roles.find((role) => role.role_id === "role.ucsf")?.claims ?? [];
  return claims.length !== 1 || claims[0] === "ucsf.compliant_releases.001";
}

function outcomeBulletsAppearFirst(roles, sourceLibrary) {
  return (roles ?? []).every((role) => {
    const claims = (role.claims ?? [])
      .map((id) => sourceLibrary.claimById.get(id))
      .filter(Boolean);
    const firstNonOutcome = claims.findIndex((claim) => (claim.metric_ids ?? []).length === 0);
    if (firstNonOutcome < 0) return true;
    return claims.slice(firstNonOutcome + 1).every((claim) => (claim.metric_ids ?? []).length === 0);
  });
}

function skillsNotMostlyBasicTools(skills) {
  const skillText = (skills ?? []).flatMap((line) => String(line).split(",")).map((item) => item.trim()).filter(Boolean);
  if (skillText.length === 0) return false;
  const basicCount = skillText.filter((skill) => /\b(jira|confluence|sql|yaml|agile|scrum)\b/i.test(skill)).length;
  return basicCount <= 2 && basicCount / skillText.length <= 0.2;
}

function bulletPatternsAreVaried(bullets) {
  const starts = bullets
    .map((bullet) => String(bullet).trim().split(/\s+/)[0]?.toLowerCase())
    .filter(Boolean);
  if (starts.length <= 3) return true;
  const counts = new Map();
  for (const start of starts) counts.set(start, (counts.get(start) ?? 0) + 1);
  const mostCommon = Math.max(...counts.values());
  const uniqueRatio = counts.size / starts.length;
  const metricHeavy = bullets.filter((bullet) => /\b\d/.test(bullet)).length;
  return mostCommon <= Math.ceil(starts.length * 0.4) && uniqueRatio >= 0.45 && metricHeavy < starts.length;
}

const BARE_PRESENT_TENSE_STARTS = new Set([
  "act",
  "align",
  "build",
  "collaborate",
  "coordinate",
  "create",
  "define",
  "design",
  "drive",
  "establish",
  "identify",
  "improve",
  "introduce",
  "lead",
  "manage",
  "own",
  "partner",
  "scale",
  "shape",
  "ship",
  "translate",
  "transform",
  "work"
]);

function barePresentTenseBulletStarts(bullets) {
  return bullets
    .filter((bullet) => {
      const firstWord = String(bullet ?? "").trim().match(/^[A-Za-z-]+/)?.[0]?.toLowerCase();
      return firstWord && BARE_PRESENT_TENSE_STARTS.has(firstWord);
    })
    .map((bullet) => String(bullet).slice(0, 120));
}

function hasSeniorLeadershipSignal(text) {
  const normalized = normalizeReadableText(text);
  return /\b(own|owns|led|lead|partner|translate|translated|strategy|roadmap|enterprise|executive|cross functional|stakeholder|scale|adoption|implementation|operationalize|requirements|systems|model|workflow|business|impact|compliance|engineering|product)\b/.test(normalized);
}

function normalizeReadableText(text) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9%$+]+/g, " ").replace(/\s+/g, " ").trim();
}

async function extractDocxReport(docxPath) {
  const zip = await JSZip.loadAsync(await fs.readFile(docxPath));
  const documentXml = await zip.file("word/document.xml").async("string");
  const relsXml = zip.file("word/_rels/document.xml.rels")
    ? await zip.file("word/_rels/document.xml.rels").async("string")
    : "";
  const text = docxXmlToText(documentXml);
  const hyperlinkTargets = [...relsXml.matchAll(/<Relationship\b[^>]*Type="[^"]*hyperlink"[^>]*Target="([^"]+)"/g)]
    .map((match) => decodeXml(match[1]));

  return {
    text,
    word_count: text.split(/\s+/).filter(Boolean).length,
    hyperlink_targets: hyperlinkTargets
  };
}

async function extractPdfReport(pdfPath) {
  if (!await pathExists(pdfPath)) return { path: pdfPath, pages: 0, links: 0, text_chars: 0 };
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  let text = "";
  let linkCount = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += `\n${content.items.map((item) => item.str).join(" ")}`;
    const annotations = await page.getAnnotations();
    linkCount += annotations.filter((annotation) => annotation.url).length;
  }
  return {
    path: pdfPath,
    pages: pdf.numPages,
    links: linkCount,
    text_chars: text.length
  };
}

function docxXmlToText(xml) {
  return String(xml)
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => decodeXml(line).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function sectionOrderReport(text) {
  const lines = String(text).split(/\n+/);
  const positions = Object.fromEntries(["SUMMARY", "EXPERIENCE", "SKILLS", "EDUCATION"].map((section) => {
    const lineIndex = lines.findIndex((line) => line.trim().toUpperCase() === section);
    return [section, lineIndex >= 0 ? lineIndex : -1];
  }));
  const inOrder = positions.SUMMARY >= 0
    && positions.EXPERIENCE > positions.SUMMARY
    && positions.SKILLS > positions.EXPERIENCE
    && positions.EDUCATION > positions.SKILLS;
  return { positions, in_order: inOrder };
}

function keywordCoverageReport(jobDescription, resumeText) {
  const keywords = extractAtsKeywords(jobDescription);
  const resume = normalizeForSearch(resumeText);
  const covered = keywords.filter((keyword) => resume.includes(normalizeForSearch(keyword)));
  const missing = keywords.filter((keyword) => !covered.includes(keyword));
  return {
    total: keywords.length,
    ratio: keywords.length ? covered.length / keywords.length : 1,
    covered,
    missing
  };
}

function extractAtsKeywords(jobDescription) {
  const normalized = normalizeForSearch(jobDescription);
  const phrases = [
    "revenue cycle",
    "rcm",
    "pre-visit",
    "eligibility",
    "benefits",
    "insurance verification",
    "cost estimation",
    "patient financial",
    "payer portal",
    "payment",
    "healthcare ai",
    "artificial intelligence",
    "clinical workflow",
    "clinician",
    "provider",
    "health system",
    "patient",
    "care team",
    "ehr",
    "fhir",
    "interoperability",
    "product management",
    "product strategy",
    "roadmap",
    "product requirements",
    "voice of customer",
    "stakeholder",
    "implementation",
    "launch",
    "adoption",
    "enterprise",
    "workflow automation",
    "documentation",
    "summarization",
    "data",
    "analytics",
    "commercial",
    "gtm",
    "partner",
    "regulated healthcare",
    "hipaa",
    "operations",
    "strategy"
  ];
  return phrases.filter((phrase) => normalized.includes(normalizeForSearch(phrase))).slice(0, 18);
}

async function readOptionalText(filePath) {
  try {
    if (!await pathExists(filePath)) return "";
    return await readText(filePath);
  } catch {
    return "";
  }
}

async function sourceMapContainsSelectedClaims(packageDir, content) {
  try {
    const sourceMap = await readJson(path.join(packageDir, "source-map.json"));
    const mapped = new Set((sourceMap.selected_claims ?? []).map((claim) => claim.id));
    return (content.selected_claim_ids ?? []).every((id) => mapped.has(id));
  } catch {
    return false;
  }
}

async function sourceMapContainsSelectedMetrics(packageDir, content) {
  try {
    const sourceMap = await readJson(path.join(packageDir, "source-map.json"));
    const mapped = new Set((sourceMap.selected_metrics ?? []).map((metric) => metric.id));
    return (content.selected_metric_ids ?? []).every((id) => mapped.has(id));
  } catch {
    return false;
  }
}

function findUnsupportedMetrics(text, content, sourceLibrary) {
  const normalizedText = normalizeMetricText(text);
  const selectedMetricIds = new Set(content.selected_metric_ids ?? []);
  const approvedFragments = new Set();
  for (const metric of sourceLibrary.metrics) {
    if (!selectedMetricIds.has(metric.id)) continue;
    approvedFragments.add(normalizeMetricText(metric.label));
    approvedFragments.add(normalizeMetricText(metric.description));
    for (const phrase of metric.allowed_phrases ?? []) {
      approvedFragments.add(normalizeMetricText(phrase));
    }
  }

  const candidates = [
    ...text.matchAll(/\b\d{1,3}(?:\.\d+)?%/g),
    ...text.matchAll(/\$\s?\d+(?:\.\d+)?\s?[KMB]?\s?PMPY\b/gi),
    ...text.matchAll(/\bNPS(?:\s+of)?\s+\d+\b/gi),
    ...text.matchAll(/\b\d+\+\s+releases\b/gi),
    ...text.matchAll(/\bmore than\s+\d+\s+releases\b/gi),
    ...text.matchAll(/\bnearly doubled\b/gi),
    ...text.matchAll(/\bHEDIS\b/g)
  ].map((match) => match[0]);

  return [...new Set(candidates)].filter((candidate) => {
    const normalizedCandidate = normalizeMetricText(candidate);
    if (!normalizedCandidate) return false;
    if (approvedFragments.has(normalizedCandidate)) return false;
    if ([...approvedFragments].some((fragment) => fragment.includes(normalizedCandidate) || normalizedCandidate.includes(fragment))) return false;
    return normalizedText.includes(normalizedCandidate);
  });
}

function findBlockedMetricConflicts(text) {
  return BLOCKED_METRIC_CONFLICTS
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => rule.label);
}

function normalizeMetricText(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9%$+]+/g, "");
}

function normalizeDescriptor(text) {
  return String(text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}
