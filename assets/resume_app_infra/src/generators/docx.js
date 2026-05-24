import fs from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType
} from "docx";
import { loadSourceLibrary } from "../config/source-library.js";
import { readJson } from "../lib/files.js";
import { splitMetricOutcomeSegments } from "../lib/metric-outcome-bolding.js";
import { packagePaths } from "../lib/package.js";

const FONT = "Work Sans";
const TEAL = "004747";
const ACCENT = "800040";
const BODY = "111827";
const RESUME_SECTION_SIZE = 23;
const RESUME_ROLE_META_SIZE = 21;
const RESUME_BODY_SIZE = 20;

export async function generateDocxFiles(packageDir, options = {}) {
  const sourceLibrary = await loadSourceLibrary(options.rootDir ?? process.cwd());
  const content = await readJson(path.join(packageDir, "approved-content.json"));
  const paths = packagePaths(packageDir, content);
  await fs.writeFile(paths.atsDocx, await Packer.toBuffer(buildAtsResumeDoc(content, sourceLibrary)));
  await fs.writeFile(paths.coverDocx, await Packer.toBuffer(buildCoverLetterDoc(content, sourceLibrary)));
  return paths;
}

function buildAtsResumeDoc(content, sourceLibrary) {
  const c = sourceLibrary.contact;
  const children = [
    topRule(),
    centeredTitle(c.name),
    centeredContact(c, { includePortfolio: false }),
    centeredTarget(`Target Role: ${content.cover_letter.target_title}`),
    sectionHeading("SUMMARY"),
    bodyParagraph(content.resume.summary, { after: 100 }),
    readMoreParagraph(content.metadata.public_url),
    sectionHeading("EXPERIENCE"),
    ...resumeRoleParagraphs(content, sourceLibrary),
    sectionHeading("SKILLS"),
    ...content.resume.skills.map((skill) => bulletParagraph(skill)),
    sectionHeading("EDUCATION"),
    ...selectedEducation(content, sourceLibrary).map((item) => bodyParagraph(item.text, { after: 40 }))
  ];

  return new Document({
    styles: defaultStyles(),
    sections: [{
      properties: {
        page: { margin: { top: 720, right: 792, bottom: 720, left: 792 } }
      },
      children
    }]
  });
}

function buildCoverLetterDoc(content, sourceLibrary) {
  const c = sourceLibrary.contact;
  const letter = content.cover_letter;
  const address = [
    letter.date,
    letter.company,
    letter.department,
    letter.company_location
  ].filter(Boolean);

  const children = [
    topRule(),
    centeredTitle(c.name),
    centeredContact(c, { after: 40 }),
    centeredTarget(`${content.metadata.role_title} | ${content.metadata.company}`, { after: 200 }),
    ...address.map((line) => bodyParagraph(line, { size: 19, after: 0 })),
    bodyParagraph(letter.greeting, { size: 20, before: 160, after: 100 }),
    ...letter.paragraphs.map((paragraph) => bodyParagraph(paragraph, { size: 19, after: 100 })),
    ...letter.closing.split("\n").map((line, index) => bodyParagraph(line, { size: 19, after: index === 0 ? 0 : 80 }))
  ];

  return new Document({
    styles: defaultStyles(),
    sections: [{
      properties: {
        page: { margin: { top: 662, right: 950, bottom: 662, left: 950 } }
      },
      children
    }]
  });
}

function resumeRoleParagraphs(content, sourceLibrary) {
  const paragraphs = [];
  for (const roleRef of content.resume.roles) {
    const claims = roleRef.claims
      .map((id) => sourceLibrary.claimById.get(id))
      .filter(Boolean);
    paragraphs.push(new Paragraph({
      children: [
        run(roleRef.employer, { bold: true, size: RESUME_SECTION_SIZE }),
        run(` | ${roleRef.location} | ${roleRef.dates}`, { size: RESUME_ROLE_META_SIZE })
      ],
      spacing: { before: 120, after: 0 }
    }));
    paragraphs.push(bodyParagraph(roleRef.descriptor, { size: RESUME_BODY_SIZE, after: 40 }));
    paragraphs.push(...roleTitleParagraphs(roleRef));
    for (const claim of claims) {
      paragraphs.push(metricBulletParagraph(claim, sourceLibrary));
    }
  }
  return paragraphs;
}

function roleTitleParagraphs(roleRef) {
  const subroles = roleRef.subroles ?? [];
  if (subroles.length === 0) {
    return [bodyParagraph(roleRef.title, { color: TEAL, bold: true, size: RESUME_ROLE_META_SIZE, after: 60 })];
  }
  return subroles.map((subrole, index) => new Paragraph({
    children: [
      run(subrole.title, { color: TEAL, bold: true, size: RESUME_ROLE_META_SIZE }),
      run(` | ${subrole.dates}`, { size: RESUME_ROLE_META_SIZE })
    ],
    spacing: { after: index === subroles.length - 1 ? 80 : 28 },
    lineSpacing: 280
  }));
}

function defaultStyles() {
  return {
    default: {
      document: {
        run: { font: FONT, size: RESUME_BODY_SIZE, color: BODY },
        paragraph: { spacing: { after: 0 } }
      }
    }
  };
}

function topRule() {
  return new Paragraph({
    children: [],
    border: { bottom: { color: ACCENT, space: 2, style: BorderStyle.SINGLE, size: 10 } },
    spacing: { after: 200 }
  });
}

function centeredTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run(text, { bold: true, color: TEAL, size: 35 })],
    spacing: { after: 0 },
    thematicBreak: false
  });
}

function centeredContact(c, options = {}) {
  const parts = [c.location, c.phone, c.email, c.linkedin_label];
  if (options.includePortfolio !== false) parts.push(c.portfolio_label);
  const text = parts.filter(Boolean).join(" | ");
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run(text, { size: 19 })],
    spacing: { after: options.after ?? 20 },
    lineSpacing: 247
  });
}

function centeredTarget(text, options = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run(text, { bold: true, color: TEAL, size: RESUME_ROLE_META_SIZE })],
    spacing: { after: options.after ?? 120 }
  });
}

function sectionHeading(text) {
  return new Paragraph({
    children: [run(text, { bold: true, color: TEAL, size: RESUME_SECTION_SIZE })],
    border: { bottom: { color: ACCENT, space: 2, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: 170, after: 80 }
  });
}

function bodyParagraph(text, options = {}) {
  return new Paragraph({
    children: [run(text, options)],
    spacing: {
      before: options.before ?? 0,
      after: options.after ?? 50
    },
    lineSpacing: options.lineSpacing ?? 300
  });
}

function bulletParagraph(text) {
  return new Paragraph({
    children: [run(`• ${text}`, { size: RESUME_BODY_SIZE })],
    indent: { left: 320, hanging: 160 },
    spacing: { after: 50 },
    lineSpacing: 295
  });
}

function metricBulletParagraph(claim, sourceLibrary) {
  const segments = splitMetricOutcomeSegments(claim.text, claim.metric_ids ?? [], sourceLibrary);
  return new Paragraph({
    children: [
      run("• ", { size: RESUME_BODY_SIZE }),
      ...segments.map((segment) => run(segment.text, { size: RESUME_BODY_SIZE, ...(segment.bold ? { bold: true } : {}) }))
    ],
    indent: { left: 320, hanging: 160 },
    spacing: { after: 50 },
    lineSpacing: 295
  });
}

function readMoreParagraph(url) {
  return new Paragraph({
    children: [
      run("Read more about me: ", { bold: true, size: RESUME_BODY_SIZE }),
      new ExternalHyperlink({
        link: url,
        children: [
          new TextRun({
            text: url,
            font: FONT,
            size: RESUME_BODY_SIZE,
            color: BODY,
            underline: { type: UnderlineType.SINGLE }
          })
        ]
      })
    ],
    spacing: { before: 100, after: 120 },
    lineSpacing: 240
  });
}

function run(text, options = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: options.size ?? RESUME_BODY_SIZE,
    bold: options.bold,
    color: options.color ?? BODY
  });
}

function selectedEducation(content, sourceLibrary) {
  const ids = new Set(content.resume.education_ids);
  return sourceLibrary.education.filter((item) => ids.has(item.id));
}
