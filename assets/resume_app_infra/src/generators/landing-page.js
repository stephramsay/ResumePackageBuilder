import path from "node:path";
import { resolveGaMeasurementId } from "../config/analytics.js";
import { loadSourceLibrary } from "../config/source-library.js";
import { ensureDir, readJson, writeText } from "../lib/files.js";
import { splitMetricOutcomeSegments } from "../lib/metric-outcome-bolding.js";
import { escapeHtml, paragraphHtml } from "../lib/strings.js";
import { packagePaths } from "../lib/package.js";

export async function generateLandingPage(packageDir, options = {}) {
  const sourceLibrary = await loadSourceLibrary(options.rootDir ?? process.cwd());
  const content = await readJson(path.join(packageDir, "approved-content.json"));
  const html = renderLandingPage(content, sourceLibrary, {
    gaMeasurementId: resolveGaMeasurementId(options.gaMeasurementId)
  });
  await writeText(path.join(packageDir, "index.html"), html);
  return html;
}

export async function generateResumeAndLetterHtml(packageDir, options = {}) {
  const sourceLibrary = await loadSourceLibrary(options.rootDir ?? process.cwd());
  const content = await readJson(path.join(packageDir, "approved-content.json"));
  const paths = packagePaths(packageDir, content);
  await ensureDir(paths.renderDir);
  await writeText(paths.atsHtml, renderAtsHtml(content, sourceLibrary));
  await writeText(paths.coverHtml, renderCoverLetterHtml(content, sourceLibrary));
  return paths;
}

export function renderLandingPage(content, sourceLibrary, options = {}) {
  const c = sourceLibrary.contact;
  const meta = content.metadata;
  const googleTag = renderGoogleTag(options.gaMeasurementId);
  const contactLinks = renderContact(c);
  const companyLogo = meta.company_logo_url
    ? `<img class="company-logo" src="${escapeHtml(meta.company_logo_url)}" alt="${escapeHtml(meta.company)} logo" loading="lazy">`
    : "";
  const resumeRoles = renderLandingRoles(content, sourceLibrary);
  const education = renderEducation(content, sourceLibrary);
  const operatingCards = content.operating_work.map((card) => {
    const classes = ["card", card.variant].filter(Boolean).join(" ");
    return `<div class="${classes}"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></div>`;
  }).join("\n        ");
  const competencies = content.resume.skills.slice(0, 6).map((skill) => {
    const [title, rest] = splitSkill(skill);
    return `<div class="competency"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(rest)}</p></div>`;
  }).join("\n        ");
  const metricCards = content.metrics_snapshot.map(formatMetricCard).filter(Boolean).slice(0, 4).map((metric) => {
    return `<div class="metric"><b>${escapeHtml(metric.label)}</b><span>${escapeHtml(metric.text)}</span></div>`;
  }).join("\n          ");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stephanie Ramsay | ${escapeHtml(meta.company)} ${escapeHtml(meta.role_title)} Executive Packet</title>
  <meta name="description" content="Executive application brief for Stephanie Ramsay, tailored to the ${escapeHtml(meta.role_title)} role at ${escapeHtml(meta.company)}.">
  ${googleTag}
  <style>
    :root {
      --ink: #071724;
      --navy: #0c3046;
      --slate: #445264;
      --muted: #6b7685;
      --line: #d8e1e7;
      --mist: #e8f5f1;
      --mint: #d7ebe5;
      --blush: #f7e7e1;
      --paper: #fbfaf7;
      --white: #ffffff;
      --gold: #b9823f;
      --shadow: 0 24px 70px rgba(7, 23, 36, 0.12);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at 20% 0%, rgba(215, 235, 229, 0.74), transparent 32rem),
        radial-gradient(circle at 84% 12%, rgba(247, 231, 225, 0.82), transparent 30rem),
        linear-gradient(135deg, #f6f8f7 0%, #eef4f2 42%, #f8f1ec 100%);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      line-height: 1.42;
    }
    a { color: inherit; text-decoration: none; }
    .shell { width: min(1180px, calc(100% - 40px)); margin: 34px auto 56px; }
    .packet-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: end;
      padding: 36px 38px;
      border: 1px solid rgba(12, 48, 70, 0.12);
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.76);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }
    .brand-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 14px; margin: 0 0 10px; }
    .company-logo { display: block; width: auto; max-width: 178px; height: 32px; object-fit: contain; }
    .eyebrow { margin: 0 0 10px; color: var(--gold); font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    .brand-row .eyebrow { margin: 0; }
    h1 { margin: 0; color: var(--ink); font-size: clamp(40px, 6vw, 76px); line-height: 0.94; letter-spacing: 0; }
    .packet-subtitle { max-width: 780px; margin: 18px 0 0; color: var(--navy); font-size: clamp(17px, 2vw, 23px); font-weight: 760; line-height: 1.18; }
    .contact { display: flex; flex-wrap: wrap; gap: 8px 13px; justify-content: flex-end; max-width: 420px; color: var(--slate); font-size: 13px; text-align: right; }
    .contact span { white-space: nowrap; }
    .nav { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 28px; }
    .nav a { padding: 10px 14px; border: 1px solid rgba(12, 48, 70, 0.14); border-radius: 999px; background: rgba(255, 255, 255, 0.62); color: var(--navy); font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    .page { margin-top: 22px; padding: 44px; border: 1px solid rgba(12, 48, 70, 0.12); border-radius: 28px; background: rgba(255, 255, 255, 0.9); box-shadow: var(--shadow); overflow: hidden; }
    .page.cover { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 34px; }
    .section-kicker { margin: 0 0 10px; color: var(--gold); font-size: 12px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
    h2 { margin: 0 0 18px; color: var(--ink); font-size: clamp(27px, 3.2vw, 42px); line-height: 1.04; letter-spacing: 0; }
    h3 { margin: 0 0 10px; color: var(--navy); font-size: 18px; line-height: 1.16; }
    p { margin: 0 0 13px; color: var(--ink); font-size: 15px; }
    .letter-meta { margin-bottom: 24px; color: var(--slate); font-size: 14px; line-height: 1.35; }
    .letter-body { max-width: 760px; }
    .letter-body p { font-size: 15.7px; line-height: 1.52; }
    .side-panel { align-self: start; position: sticky; top: 20px; padding: 24px; border: 1px solid rgba(12, 48, 70, 0.12); border-radius: 22px; background: linear-gradient(180deg, rgba(232, 245, 241, 0.96), rgba(247, 231, 225, 0.72)); }
    .side-panel strong { display: block; margin-bottom: 10px; color: var(--navy); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; }
    .side-panel p { color: var(--slate); font-size: 13.5px; }
    .signal-list { display: grid; gap: 9px; margin-top: 18px; }
    .signal-list div { padding: 12px; border-radius: 14px; background: rgba(255, 255, 255, 0.62); color: var(--ink); font-size: 13px; font-weight: 720; }
    .link-cluster { display: grid; gap: 8px; margin-top: 18px; }
    .link-cluster a { display: block; padding: 10px 12px; border: 1px solid rgba(12, 48, 70, 0.12); border-radius: 999px; background: rgba(255, 255, 255, 0.62); color: var(--navy); font-size: 12px; font-weight: 820; text-align: center; }
    .profile-grid { display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: 28px; align-items: start; }
    .executive-summary { padding: 24px; border-left: 5px solid var(--navy); border-radius: 20px; background: linear-gradient(135deg, rgba(232, 245, 241, 0.74), rgba(255, 255, 255, 0.72)); }
    .executive-summary p { margin-bottom: 0; font-size: 16px; line-height: 1.48; }
    .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .metric { min-height: 120px; padding: 18px; border: 1px solid rgba(12, 48, 70, 0.12); border-radius: 20px; background: var(--paper); }
    .metric b { display: block; color: var(--navy); font-size: 38px; line-height: 0.95; letter-spacing: 0; }
    .metric span { display: block; margin-top: 10px; color: var(--slate); font-size: 13px; font-weight: 700; line-height: 1.22; }
    .timeline { display: grid; gap: 20px; margin-top: 26px; }
    .role { position: relative; display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 28px; padding: 26px 0; border-top: 1px solid var(--line); }
    .role:first-child { border-top: 0; padding-top: 0; }
    .role-meta .company { color: var(--ink); font-size: 21px; font-weight: 850; line-height: 1.1; }
    .role-meta .dates { margin-top: 5px; color: var(--slate); font-size: 14px; font-weight: 680; }
    .role-meta .descriptor { margin-top: 14px; color: var(--muted); font-size: 13px; line-height: 1.35; }
    .role-title { margin-bottom: 11px; color: var(--navy); font-size: 16px; font-weight: 840; line-height: 1.25; }
    .role-progression { display: grid; gap: 5px; margin-bottom: 12px; }
    .subrole { display: flex; flex-wrap: wrap; gap: 4px 8px; color: var(--slate); font-size: 13.8px; font-weight: 680; line-height: 1.25; }
    .subrole strong { color: var(--navy); font-size: 15.5px; font-weight: 840; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 8px; color: var(--ink); font-size: 14.3px; line-height: 1.36; padding-left: 2px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
    .card { padding: 22px; border: 1px solid rgba(12, 48, 70, 0.12); border-radius: 22px; background: rgba(255, 255, 255, 0.74); }
    .card.mist { background: linear-gradient(135deg, rgba(232, 245, 241, 0.92), rgba(255, 255, 255, 0.78)); }
    .card.blush { background: linear-gradient(135deg, rgba(247, 231, 225, 0.9), rgba(255, 255, 255, 0.76)); }
    .pill-grid { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 12px; }
    .pill { padding: 8px 10px; border: 1px solid rgba(12, 48, 70, 0.1); border-radius: 999px; background: rgba(255, 255, 255, 0.72); color: var(--navy); font-size: 12.4px; font-weight: 760; }
    .competency-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
    .competency { padding: 17px; border-radius: 18px; background: var(--paper); border: 1px solid rgba(12, 48, 70, 0.1); }
    .competency h3 { margin-bottom: 7px; font-size: 15px; }
    .competency p { margin: 0; color: var(--slate); font-size: 13.2px; line-height: 1.34; }
    .style-hero { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr); gap: 18px; align-items: stretch; margin-top: 22px; }
    .style-card { position: relative; min-height: 360px; padding: 30px; border-radius: 28px; overflow: hidden; border: 1px solid rgba(12, 48, 70, 0.12); }
    .style-card.primary { background: linear-gradient(145deg, var(--blush), #fff7f2); }
    .style-card.secondary { background: linear-gradient(145deg, var(--mist), #f7fbf9); }
    .style-card:after { content: ""; position: absolute; right: -58px; bottom: -74px; width: 220px; height: 220px; border-radius: 999px; border: 36px solid rgba(12, 48, 70, 0.06); }
    .style-label { display: inline-block; margin-bottom: 34px; padding-bottom: 10px; border-bottom: 4px solid var(--navy); color: var(--navy); font-size: 13px; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; }
    .style-card h3 { margin-bottom: 22px; color: var(--ink); font-size: 34px; line-height: 1.05; }
    .style-card ul { position: relative; z-index: 1; display: grid; gap: 10px; max-width: 420px; padding: 18px 20px 18px 38px; border: 1px solid rgba(12, 48, 70, 0.09); border-radius: 18px; background: rgba(255, 255, 255, 0.54); }
    .style-card li { margin: 0; font-size: 15px; font-weight: 720; }
    .note { margin-top: 18px; padding: 18px 20px; border-radius: 20px; background: var(--ink); color: var(--white); }
    .note p { margin: 0; color: var(--white); font-size: 14px; line-height: 1.45; }
    .print-actions { display: flex; justify-content: center; margin-top: 22px; }
    .print-actions button { cursor: pointer; padding: 13px 18px; border: 0; border-radius: 999px; background: var(--navy); color: var(--white); font-size: 13px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 12px 30px rgba(12, 48, 70, 0.22); }
    .pdf-bottom-links, .pdf-inline-header { display: none; }
    @media (max-width: 920px) {
      .packet-header, .page.cover, .profile-grid, .role, .two-col, .competency-grid, .style-hero { grid-template-columns: 1fr; }
      .contact { justify-content: flex-start; text-align: left; }
      .side-panel { position: static; }
      .page { padding: 26px; }
    }
    @media print {
      @page { size: 8.5in 80in; margin: 0.22in; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        background:
          radial-gradient(circle at 20% 0%, rgba(215, 235, 229, 0.74), transparent 32rem),
          radial-gradient(circle at 84% 12%, rgba(247, 231, 225, 0.82), transparent 30rem),
          linear-gradient(135deg, #f6f8f7 0%, #eef4f2 42%, #f8f1ec 100%);
      }
      .shell { width: 100%; margin: 0; }
      .nav, .print-actions, .packet-header { display: none; }
      .page { margin: 0 0 0.18in; padding: 0.34in; border-radius: 0.2in; box-shadow: none; page-break-after: auto; break-after: auto; }
      .page.cover { margin-top: 0; border-radius: 0.2in; padding-top: 0.28in; }
      .pdf-inline-header { display: block; margin-bottom: 0.26in; padding-bottom: 0.2in; border-bottom: 1px solid rgba(12, 48, 70, 0.14); }
      .pdf-inline-header .eyebrow { margin-bottom: 0.08in; }
      .pdf-inline-header h1 { font-size: 38pt; line-height: 0.98; margin-bottom: 0.08in; }
      .pdf-inline-header .packet-subtitle { max-width: 100%; margin: 0 0 0.16in; font-size: 14.5pt; }
      .pdf-inline-header .contact { justify-content: flex-start; max-width: 100%; text-align: left; }
      .page.cover, .profile-grid, .style-hero { grid-template-columns: 1fr; }
      .page.cover .side-panel { display: none; }
      .pdf-bottom-links { display: block; margin: 0; padding: 0.3in 0.34in 0.34in; border: 1px solid rgba(12, 48, 70, 0.12); border-radius: 0.2in; background: rgba(255, 255, 255, 0.9); }
      .pdf-bottom-links .link-cluster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.12in; }
      .role { grid-template-columns: 1.8in 1fr; gap: 0.24in; break-inside: avoid; }
      .style-card { min-height: auto; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="packet-header">
      <div>
        <div class="brand-row">${companyLogo}<p class="eyebrow">${escapeHtml(content.positioning.eyebrow)}</p></div>
        <h1>${escapeHtml(c.name)}</h1>
        <p class="packet-subtitle">${escapeHtml(content.positioning.hero_subtitle)}</p>
      </div>
      <div class="contact" aria-label="Contact information">${contactLinks}</div>
    </header>

    <nav class="nav" aria-label="Packet navigation">
      <a href="#cover">Cover Letter</a>
      <a href="#resume">Resume</a>
      <a href="#operating-work">Operating Work</a>
      <a href="#leadership-style">Leadership Style</a>
    </nav>

    <section class="page cover" id="cover">
      <div class="letter-body">
        <div class="pdf-inline-header">
          <div class="brand-row">${companyLogo}<p class="eyebrow">${escapeHtml(content.positioning.eyebrow)}</p></div>
          <h1>${escapeHtml(c.name)}</h1>
          <p class="packet-subtitle">${escapeHtml(content.positioning.hero_subtitle)}</p>
          <div class="contact" aria-label="PDF contact information">${contactLinks}</div>
        </div>
        <p class="section-kicker">Cover Letter</p>
        <h2>${escapeHtml(content.cover_letter.target_title)}</h2>
        <div class="letter-meta">
          ${escapeHtml(content.cover_letter.date)}<br>
          ${escapeHtml(content.cover_letter.company)}${content.cover_letter.department ? `<br>${escapeHtml(content.cover_letter.department)}` : ""}${content.cover_letter.company_location ? `<br>${escapeHtml(content.cover_letter.company_location)}` : ""}
        </div>

        <p>${escapeHtml(content.cover_letter.greeting)}</p>
        ${paragraphHtml(content.cover_letter.paragraphs)}
        <p>${escapeHtml(content.cover_letter.closing).replace("\n", "<br>")}</p>
      </div>

      <aside class="side-panel">
        <strong>Positioning Signal</strong>
        <p>${escapeHtml(content.positioning.side_panel_summary)}</p>
        <div class="signal-list">
          ${content.positioning.side_panel_signals.map((signal) => `<div>${escapeHtml(signal)}</div>`).join("\n          ")}
        </div>
        <div class="link-cluster" aria-label="Relevant links">
          <a href="${escapeHtml(c.email_href)}">Email Stephanie</a>
          <a href="${escapeHtml(c.linkedin_url)}">LinkedIn Profile</a>
          <a href="${escapeHtml(c.portfolio_url)}">Portfolio Site</a>
        </div>
      </aside>
    </section>

    <section class="page" id="resume">
      <p class="section-kicker">Executive Resume</p>
      <h2>${escapeHtml(content.positioning.resume_headline)}</h2>

      <div class="profile-grid">
        <div class="executive-summary">
          <h3>Executive Profile</h3>
          <p>${escapeHtml(content.resume.summary)}</p>
        </div>

        <div class="metrics" aria-label="Impact snapshot">
          ${metricCards}
        </div>
      </div>

      <div class="timeline">
        ${resumeRoles}
      </div>
    </section>

    <section class="page" id="operating-work">
      <p class="section-kicker">Operating Pattern</p>
      <h2>Selected Product, Clinical Workflow & Launch Work</h2>

      <div class="two-col">
        ${operatingCards}
      </div>

      <h3 style="margin-top: 28px;">Education</h3>
      <div class="pill-grid" aria-label="Education">
        ${education}
      </div>

      <h3 style="margin-top: 30px;">Core Competencies</h3>
      <div class="competency-grid">
        ${competencies}
      </div>
    </section>

    <section class="page" id="leadership-style">
      <p class="section-kicker">Personality & Leadership Style</p>
      <h2>Enneagram Results</h2>
      <p style="max-width: 780px;">${escapeHtml(content.leadership_style.intro)}</p>

      <div class="style-hero">
        ${renderStyleCard(content.leadership_style.primary, "primary")}
        ${renderStyleCard(content.leadership_style.secondary, "secondary")}
      </div>

      <div class="note"><p>${escapeHtml(content.leadership_style.note)}</p></div>
    </section>

    <section class="pdf-bottom-links" aria-label="PDF contact links">
      <p class="section-kicker">Links</p>
      <div class="link-cluster">
        <a href="${escapeHtml(c.email_href)}">Email Stephanie</a>
        <a href="${escapeHtml(c.linkedin_url)}">LinkedIn Profile</a>
        <a href="${escapeHtml(c.portfolio_url)}">Portfolio Site</a>
      </div>
    </section>

    <div class="print-actions">
      <button type="button" onclick="window.print()">Print or Save as PDF</button>
    </div>
  </main>
</body>
</html>
`;
}

export function renderGoogleTag(measurementId) {
  const normalizedId = resolveGaMeasurementId(measurementId);
  if (!normalizedId) return "";
  return `<!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(normalizedId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${normalizedId}', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  </script>`;
}

function formatMetricCard(metric) {
  const label = metricDisplayLabel(metric);
  if (!/\d/.test(label)) return null;
  return {
    ...metric,
    label,
    text: metricDisplayText(metric, label)
  };
}

function metricDisplayLabel(metric) {
  const raw = String(metric.label ?? "").trim();
  const range = raw.match(/^(\d+(?:\.\d+)?)%\s+to\s+(\d+(?:\.\d+)?)%$/i);
  if (range) {
    const from = Number(range[1]);
    const to = Number(range[2]);
    if (from > 0 && to > from) return `${Math.round(((to - from) / from) * 100)}%`;
  }
  if (/^nearly doubled$/i.test(raw)) return "2X";
  const nps = raw.match(/^NPS\s+(\d+)$/i);
  if (nps) return nps[1];
  const below = raw.match(/^below\s+(\d+(?:\.\d+)?%)$/i);
  if (below) return below[1];
  return raw;
}

function metricDisplayText(metric, label) {
  let text = String(metric.text ?? "").trim();
  const rawLabel = String(metric.label ?? "").trim();
  if (/^NPS\s+\d+$/i.test(rawLabel) && !/net promoter score/i.test(text)) {
    text = `Net Promoter Score ${text}`.trim();
  }
  if (/^below\s+\d+(?:\.\d+)?%$/i.test(rawLabel) && !/\bbelow\b/i.test(text)) {
    text = `below ${text}`.trim();
  }
  const escapedRaw = escapeRegExp(rawLabel);
  const escapedLabel = escapeRegExp(label);
  text = text
    .replace(new RegExp(`\\b${escapedRaw}\\b`, "gi"), "")
    .replace(new RegExp(`\\b${escapedLabel}\\b`, "gi"), "")
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[,;:-]\s*/, "")
    .trim();
  return text || metric.text;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderAtsHtml(content, sourceLibrary) {
  const c = sourceLibrary.contact;
  const roles = renderPlainResumeRoles(content, sourceLibrary, "html");
  const skills = content.resume.skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("\n      ");
  const education = selectedEducation(content, sourceLibrary).map((item) => `<p>${escapeHtml(item.text)}</p>`).join("\n      ");
  const readMore = content.metadata.public_url;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Stephanie Ramsay | ${escapeHtml(content.metadata.company)} ${escapeHtml(content.metadata.role_title)} ATS Resume</title>
  <style>
    @page { size: letter; margin: 0.5in 0.6in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: "Work Sans", Arial, sans-serif; font-size: 11pt; line-height: 1.3; }
    a { color: inherit; }
    .top-rule { border-bottom: 1.4pt solid #800040; margin-bottom: 8pt; }
    h1 { margin: 0; color: #004747; text-align: center; font-size: 18pt; line-height: 1.04; }
    .contact { margin: 3pt 0 6pt; text-align: center; font-size: 8.8pt; }
    .target { margin: 0 0 8pt; color: #004747; text-align: center; font-size: 10pt; font-weight: 700; }
    h2 { margin: 9pt 0 4pt; padding-bottom: 2.5pt; border-bottom: 0.8pt solid #800040; color: #004747; font-size: 11.5pt; letter-spacing: 0; }
    p { margin: 0 0 4pt; }
    .read-more { margin: 6pt 0 8pt; }
    .role-heading { margin-top: 7pt; font-size: 11pt; }
    .role-heading strong { font-weight: 700; }
    .role-title { margin-bottom: 4pt; color: #004747; font-weight: 700; }
    .role-progression { margin-bottom: 4pt; }
    .subrole { margin: 0 0 2pt; color: #111827; font-size: 10.2pt; }
    .subrole strong { color: #004747; font-weight: 700; }
    ul { margin: 0 0 4pt 0.22in; padding: 0; }
    li { margin: 0 0 3.2pt; }
  </style>
</head>
<body>
  <div class="top-rule"></div>
  <h1>${escapeHtml(c.name)}</h1>
  <div class="contact">${resumeHeaderContactHtml(c)}</div>
  <div class="target">Target Role: ${escapeHtml(content.cover_letter.target_title)}</div>
  <h2>SUMMARY</h2>
  <p>${escapeHtml(content.resume.summary)}</p>
  <p class="read-more"><strong>Read more about me:</strong> <a href="${escapeHtml(readMore)}">${escapeHtml(readMore)}</a></p>
  <h2>EXPERIENCE</h2>
  ${roles}
  <h2>SKILLS</h2>
  <ul>
      ${skills}
  </ul>
  <h2>EDUCATION</h2>
  ${education}
</body>
</html>
`;
}

export function renderCoverLetterHtml(content, sourceLibrary) {
  const c = sourceLibrary.contact;
  const letter = content.cover_letter;
  const department = letter.department ? `<p>${escapeHtml(letter.department)}</p>` : "";
  const location = letter.company_location ? `<p>${escapeHtml(letter.company_location)}</p>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Stephanie Ramsay | ${escapeHtml(content.metadata.company)} Cover Letter</title>
  <style>
    @page { size: letter; margin: 0.46in 0.66in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: "Work Sans", Arial, sans-serif; font-size: 9pt; line-height: 1.24; }
    a { color: inherit; }
    .top-rule { border-bottom: 1.4pt solid #800040; margin-bottom: 7pt; }
    h1 { margin: 0; color: #004747; text-align: center; font-size: 17pt; line-height: 1.02; }
    .contact { margin: 2pt 0 5pt; text-align: center; font-size: 8pt; }
    .target { margin: 0 0 10pt; color: #004747; text-align: center; font-size: 8.5pt; font-weight: 700; }
    p { margin: 0 0 5pt; }
    .address { margin-bottom: 8pt; }
    .greeting { margin-top: 8pt; font-size: 9.5pt; }
  </style>
</head>
<body>
  <div class="top-rule"></div>
  <h1>${escapeHtml(c.name)}</h1>
  <div class="contact">${escapeHtml(c.location)} | ${escapeHtml(c.phone)} | <a href="${escapeHtml(c.email_href)}">${escapeHtml(c.email)}</a> | <a href="${escapeHtml(c.linkedin_url)}">${escapeHtml(c.linkedin_label)}</a> | <a href="${escapeHtml(c.portfolio_url)}">${escapeHtml(c.portfolio_label)}</a></div>
  <div class="target">${escapeHtml(content.metadata.role_title)} | ${escapeHtml(content.metadata.company)}</div>
  <div class="address">
    <p>${escapeHtml(letter.date)}</p>
    <p>${escapeHtml(letter.company)}</p>
    ${department}
    ${location}
  </div>
  <p class="greeting">${escapeHtml(letter.greeting)}</p>
  ${paragraphHtml(letter.paragraphs)}
  <p>${escapeHtml(letter.closing).replace("\n", "<br>")}</p>
</body>
</html>
`;
}

function renderContact(c) {
  return `
        <span>${escapeHtml(c.location)}</span>
        <a href="${escapeHtml(c.phone_href)}"><span>${escapeHtml(c.phone)}</span></a>
        <a href="${escapeHtml(c.email_href)}"><span>${escapeHtml(c.email)}</span></a>
        <a href="${escapeHtml(c.linkedin_url)}"><span>${escapeHtml(c.linkedin_label)}</span></a>
        <a href="${escapeHtml(c.portfolio_url)}"><span>${escapeHtml(c.portfolio_label)}</span></a>`;
}

function resumeHeaderContactHtml(c) {
  return [
    escapeHtml(c.location),
    escapeHtml(c.phone),
    `<a href="${escapeHtml(c.email_href)}">${escapeHtml(c.email)}</a>`,
    `<a href="${escapeHtml(c.linkedin_url)}">${escapeHtml(c.linkedin_label)}</a>`
  ].filter(Boolean).join(" | ");
}

function renderLandingRoles(content, sourceLibrary) {
  return content.resume.roles.map((roleRef) => {
    const role = sourceLibrary.roleById.get(roleRef.role_id);
    const claims = roleRef.claims
      .map((id) => sourceLibrary.claimById.get(id))
      .filter(Boolean);
    return `<article class="role">
          <div class="role-meta">
            <div class="company">${escapeHtml(roleRef.employer)}</div>
            <div class="dates">${escapeHtml(roleRef.dates)}</div>
            <div class="descriptor">${escapeHtml(roleRef.descriptor)}</div>
          </div>
          <div>
            ${renderRoleTitleBlock(roleRef)}
            <ul>
              ${claims.map((claim) => `<li>${renderClaimText(claim, sourceLibrary)}</li>`).join("\n              ")}
            </ul>
          </div>
        </article>`;
  }).join("\n\n        ");
}

function renderPlainResumeRoles(content, sourceLibrary) {
  return content.resume.roles.map((roleRef) => {
    const claims = roleRef.claims
      .map((id) => sourceLibrary.claimById.get(id))
      .filter(Boolean);
    return `<p class="role-heading"><strong>${escapeHtml(roleRef.employer)}</strong> | ${escapeHtml(roleRef.location)} | ${escapeHtml(roleRef.dates)}</p>
  <p>${escapeHtml(roleRef.descriptor)}</p>
  ${renderRoleTitleBlock(roleRef)}
  <ul>
    ${claims.map((claim) => `<li>${renderClaimText(claim, sourceLibrary)}</li>`).join("\n    ")}
  </ul>`;
  }).join("\n  ");
}

function renderClaimText(claim, sourceLibrary) {
  return splitMetricOutcomeSegments(claim.text, claim.metric_ids ?? [], sourceLibrary)
    .map((segment) => segment.bold ? `<strong>${escapeHtml(segment.text)}</strong>` : escapeHtml(segment.text))
    .join("");
}

function renderRoleTitleBlock(roleRef) {
  const subroles = roleRef.subroles ?? [];
  if (subroles.length === 0) return `<p class="role-title">${escapeHtml(roleRef.title)}</p>`;
  return `<div class="role-progression">
    ${subroles.map((subrole) => `<p class="subrole"><strong>${escapeHtml(subrole.title)}</strong><span> | ${escapeHtml(subrole.dates)}</span></p>`).join("\n    ")}
  </div>`;
}

function selectedEducation(content, sourceLibrary) {
  const ids = new Set(content.resume.education_ids);
  return sourceLibrary.education.filter((item) => ids.has(item.id));
}

function renderEducation(content, sourceLibrary) {
  return selectedEducation(content, sourceLibrary).map((item) => `<span class="pill">${escapeHtml(item.text)}</span>`).join("\n        ");
}

function renderStyleCard(style, variant) {
  return `<article class="style-card ${variant}">
          <span class="style-label">${escapeHtml(style.label)}</span>
          <h3>${escapeHtml(style.title)}</h3>
          <ul>
            ${style.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("\n            ")}
          </ul>
        </article>`;
}

function splitSkill(skill) {
  const [title, ...rest] = String(skill).split(",");
  return [title.trim(), rest.join(",").trim() || skill];
}
