import path from "node:path";
import { readYaml } from "../lib/files.js";

export async function loadSourceLibrary(rootDir = process.cwd()) {
  const sourceDir = path.join(rootDir, "source_data");
  const [contact, metrics, positioning, education, facts, skillBank, roleBulletBank] = await Promise.all([
    readYaml(path.join(sourceDir, "contact.yml")),
    readYaml(path.join(sourceDir, "approved-metrics.yml")),
    readYaml(path.join(sourceDir, "positioning-rules.yml")),
    readYaml(path.join(sourceDir, "education.yml")),
    readYaml(path.join(sourceDir, "resume-facts.yml")),
    readYaml(path.join(sourceDir, "skill-bank.yml")),
    readYaml(path.join(sourceDir, "role-bullet-bank.yml"))
  ]);

  const metricById = new Map(metrics.metrics.map((metric) => [metric.id, metric]));
  const claimById = new Map();
  const roleById = new Map();
  const roles = mergeRoleBulletBank(facts.roles, roleBulletBank, metrics.metrics);

  for (const role of roles) {
    roleById.set(role.id, role);
    for (const claim of role.claims ?? []) {
      claimById.set(claim.id, { ...claim, role_id: role.id, employer: role.employer });
    }
  }

  return {
    contact,
    metrics: metrics.metrics,
    metricById,
    positioning,
    education: education.education,
    roles,
    roleById,
    claimById,
    skillBank: normalizeSkillBank(skillBank)
  };
}

function mergeRoleBulletBank(roles, roleBulletBank, metrics = []) {
  const bankRoles = Array.isArray(roleBulletBank?.roles) ? roleBulletBank.roles : [];
  const bulletsByRoleId = new Map(bankRoles.map((role) => [role.role_id, role.bullets ?? []]));
  return roles.map((role) => {
    const bankBullets = bulletsByRoleId.get(role.id) ?? [];
    if (bankBullets.length === 0) return role;
    const generatedClaims = bankBullets.map((text, index) => ({
      id: `${role.id.replace(/^role\./, "")}.bank.${String(index + 1).padStart(3, "0")}`,
      text,
      tags: inferClaimTags(text),
      metric_ids: inferClaimMetricIds(text, metrics)
    }));
    const existingTexts = (role.claims ?? []).map((claim) => claim.text);
    const claims = [
      ...(role.claims ?? []),
      ...generatedClaims.filter((claim) => !existingTexts.some((text) => textIsNearDuplicate(text, claim.text)))
    ];
    return { ...role, claims };
  });
}

function inferClaimMetricIds(text, metrics) {
  const normalized = normalizeSearchText(text);
  const ids = [];
  for (const metric of metrics) {
    const allowedPhrases = metric.allowed_phrases ?? [];
    const matched = allowedPhrases.some((phrase) => {
      const normalizedPhrase = normalizeSearchText(phrase);
      return normalizedPhrase && normalized.includes(normalizedPhrase);
    });
    if (matched) ids.push(metric.id);
  }
  return uniqueStrings(ids);
}

function inferClaimTags(text) {
  const normalized = normalizeSearchText(text);
  const rules = [
    ["healthcare_ai", [" ai ", "ai-", "artificial intelligence", "summarization", "documentation"]],
    ["medical_record_summarization", ["medical record summarization", "chart review"]],
    ["documentation", ["documentation", "provider reporting"]],
    ["workflow_automation", ["automation", "automated", "workflow automation", "reminder systems"]],
    ["clinical_workflows", ["clinical", "care delivery", "care workflows", "clinician", "provider"]],
    ["provider_workflows", ["provider", "clinician", "hospital", "clinic"]],
    ["health_systems", ["health system", "enterprise healthcare", "hospital", "large health"]],
    ["enterprise_adoption", ["enterprise adoption", "enterprise partner", "partner onboarding", "scaled delivery"]],
    ["implementation", ["implementation", "rollout", "operationalize", "onboarding", "deployment"]],
    ["launch", ["launch", "shipped", "delivered", "release"]],
    ["adoption", ["adoption", "activation", "engagement", "retention"]],
    ["roadmap", ["roadmap", "okr", "objective setting", "priorities"]],
    ["product_requirements", ["requirements", "specifications", "user stories", "acceptance criteria", "technical requirements"]],
    ["strategy_to_execution", ["strategy", "execution", "vision", "scalable", "scale"]],
    ["voc", ["feedback", "interviews", "surveys", "discovery"]],
    ["partner_enablement", ["partner", "client-facing", "demos", "relationship"]],
    ["billing", ["billing", "insurance billing", "e/m", "ccm", "payer"]],
    ["rpm", ["rpm", "remote monitoring"]],
    ["fhir", ["fhir"]],
    ["ehr", ["ehr"]],
    ["interoperability", ["interoperable", "interoperability", "data exchange"]],
    ["data_sharing", ["data sharing", "data integrity", "data model", "dashboards", "reporting"]],
    ["dashboards", ["dashboard", "dashboards", "visualization", "metrics"]],
    ["participant_experience", ["participant", "patient experience", "patient-facing", "member", "mobile experience"]],
    ["patient_access", ["access", "intake", "eligibility", "app-less"]],
    ["patient_tools", ["portal", "mobile", "app", "patient-facing"]],
    ["patient_communication", ["patient communication", "participant support", "sms", "email", "phone", "secure messaging", "call center"]],
    ["call_center", ["call center", "contact center", "twilio"]],
    ["twilio", ["twilio"]],
    ["engagement", ["engagement", "touchpoints", "communication", "outreach"]],
    ["omnichannel", ["omnichannel", "sms", "email", "phone", "secure messaging", "in-app"]],
    ["activation", ["activation", "conversion", "enrollment"]],
    ["clinical_research", ["research", "breast cancer prevention", "wisdom"]],
    ["research_operations", ["research", "release cycles"]],
    ["compliance", ["compliance", "hipaa", "cms", "regulatory", "privacy", "security"]],
    ["compliant_product", ["compliant", "regulatory"]]
  ];
  const tags = [];
  for (const [tag, patterns] of rules) {
    if (patterns.some((pattern) => normalized.includes(normalizeSearchText(pattern)))) tags.push(tag);
  }
  return uniqueStrings(tags);
}

function normalizeSkillBank(skillBank) {
  const skills = Array.isArray(skillBank?.skills) ? skillBank.skills : [];
  const out = [];
  for (const skill of uniqueStrings(skills)) {
    if (out.some((existing) => textIsNearDuplicate(existing, skill))) continue;
    out.push(skill);
  }
  return out;
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value ?? "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function normalizeTextKey(text) {
  return normalizeSearchText(text);
}

function normalizeSearchText(text) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function textIsNearDuplicate(a, b) {
  const aKey = normalizeTextKey(a);
  const bKey = normalizeTextKey(b);
  if (!aKey || !bKey) return false;
  if (aKey === bKey || aKey.includes(bKey) || bKey.includes(aKey)) return true;
  const aTokens = meaningfulTokens(aKey);
  const bTokens = meaningfulTokens(bKey);
  const smaller = Math.min(aTokens.size, bTokens.size);
  if (smaller < 4) return false;
  const shared = [...aTokens].filter((token) => bTokens.has(token)).length;
  return shared / smaller >= 0.72;
}

function meaningfulTokens(text) {
  const stop = new Set(["and", "the", "with", "from", "into", "that", "this", "across", "through", "using"]);
  return new Set(String(text).split(/\s+/).filter((token) => token.length > 3 && !stop.has(token)));
}

export function getClaimsByIds(sourceLibrary, claimIds) {
  return claimIds
    .map((id) => sourceLibrary.claimById.get(id))
    .filter(Boolean);
}

export function getMetricsByIds(sourceLibrary, metricIds) {
  return metricIds
    .map((id) => sourceLibrary.metricById.get(id))
    .filter(Boolean);
}
