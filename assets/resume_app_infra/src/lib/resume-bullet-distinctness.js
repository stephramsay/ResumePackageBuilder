const PURPOSE_RULES = [
  {
    id: "workflow-voc-requirements",
    label: "workflow discovery / needs translation / requirements",
    match: (text) => has(text, "workflow") && has(text, "translate") && any(text, ["requirements", "constraints", "findings", "needs", "voc"])
  },
  {
    id: "enterprise-adoption-implementation",
    label: "enterprise adoption / partner rollout / implementation scale",
    match: (text) => any(text, ["enterprise", "health system", "partner program", "partner programs"])
      && any(text, ["adoption", "onboarding", "integration", "scale", "implementation"])
  },
  {
    id: "intake-eligibility-workflow",
    label: "intake / eligibility workflow",
    match: (text) => has(text, "intake")
      && has(text, "eligibility")
      && !any(text, ["insurance verification", "billing", "clinical escalation", "follow-up", "follow up", "support"])
  },
  {
    id: "ai-documentation-capacity",
    label: "AI documentation / summarization / capacity",
    match: (text) => /\bai\b/.test(text)
      && any(text, ["documentation", "summarization", "chart review", "administrative burden", "provider reporting"])
  },
  {
    id: "omnichannel-engagement",
    label: "omnichannel engagement / patient communication",
    match: (text) => (has(text, "omnichannel") && has(text, "engagement"))
      || countMatches(text, ["phone", "sms", "email", "secure messaging", "video"]) >= 3
  },
  {
    id: "scheduling-reminders",
    label: "scheduling / reminders / no-shows",
    match: (text) => any(text, ["scheduling", "reminder", "reminders", "no show", "no shows", "appointment"])
  },
  {
    id: "participant-satisfaction-nps",
    label: "participant satisfaction / NPS outcome",
    match: (text) => has(text, "nps") || (has(text, "96") && has(text, "satisfaction"))
  },
  {
    id: "patient-facing-platform-variants",
    label: "white-labeled patient-facing platform variants",
    match: (text) => any(text, ["white labeled", "white-labeled"]) && any(text, ["patient facing", "patient-facing", "brands", "populations"])
  },
  {
    id: "mobile-experience-rebuild",
    label: "mobile experience rebuild",
    match: (text) => any(text, ["mobile", "ios", "android", "app satisfaction"]) && any(text, ["reimagining", "rebuild", "design system"])
  },
  {
    id: "app-less-access-equity",
    label: "app-less access / equity",
    match: (text) => any(text, ["app less", "app-less", "smartphones", "wi fi", "wi-fi"]) && any(text, ["access", "equity", "reach"])
  },
  {
    id: "risk-governance-escalation",
    label: "risk triage / governance / safety escalation",
    match: (text) => has(text, "risk") && any(text, ["triage", "escalation", "safety", "compliance", "reliability"])
  },
  {
    id: "data-dashboard-reporting",
    label: "data dashboards / reporting / visibility",
    match: (text) => any(text, ["dashboard", "dashboards", "reporting", "data sharing", "visibility"]) && !has(text, "medical record")
  },
  {
    id: "data-model-migration",
    label: "data model simplification / migration",
    match: (text) => has(text, "data model") && any(text, ["migration", "unused tables", "scalability", "performance"])
  }
];

const TOKEN_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "that",
  "to",
  "with",
  "within",
  "without"
]);

export function claimPurposeFamilies(text) {
  const normalized = normalizePurposeText(text);
  return PURPOSE_RULES
    .filter((rule) => rule.match(normalized))
    .map((rule) => ({ id: rule.id, label: rule.label }));
}

export function claimPurposeFamilyIds(text) {
  return claimPurposeFamilies(text).map((family) => family.id);
}

export function findResumeBulletDistinctnessIssues(content, sourceLibrary) {
  const issues = [];
  for (const role of content.resume?.roles ?? []) {
    const claims = (role.claims ?? [])
      .map((id) => sourceLibrary.claimById.get(id))
      .filter(Boolean);
    for (let i = 0; i < claims.length; i += 1) {
      for (let j = i + 1; j < claims.length; j += 1) {
        const issue = compareClaimsWithinRole(role, claims[i], claims[j]);
        if (issue) issues.push(issue);
      }
    }
  }
  return issues;
}

export function buildResumeBulletDistinctnessReport(content, sourceLibrary) {
  const issues = findResumeBulletDistinctnessIssues(content, sourceLibrary);
  return {
    passed: issues.length === 0,
    scope: "within each resume role/company only",
    issues
  };
}

export function formatResumeBulletDistinctnessIssues(issues, limit = 5) {
  const shown = issues.slice(0, limit).map((issue) => {
    const first = issue.first.text.slice(0, 105);
    const second = issue.second.text.slice(0, 105);
    return `${issue.employer}: ${issue.reason} (${issue.first.id} <-> ${issue.second.id}) [${first} / ${second}]`;
  });
  const more = issues.length > limit ? `; +${issues.length - limit} more` : "";
  return `${shown.join("; ")}${more}`;
}

function compareClaimsWithinRole(role, first, second) {
  const firstFamilies = claimPurposeFamilies(first.text);
  const secondFamilyIds = new Set(claimPurposeFamilyIds(second.text));
  const sharedFamily = firstFamilies.find((family) => secondFamilyIds.has(family.id));
  if (sharedFamily) {
    return makeIssue(role, first, second, `same purpose: ${sharedFamily.label}`);
  }

  const similarity = tokenSimilarity(first.text, second.text);
  if (similarity >= 0.58) {
    return makeIssue(role, first, second, `high wording overlap: ${Math.round(similarity * 100)}% shared signal`);
  }

  return null;
}

function makeIssue(role, first, second, reason) {
  return {
    role_id: role.role_id,
    employer: role.employer,
    reason,
    first: {
      id: first.id,
      text: first.text
    },
    second: {
      id: second.id,
      text: second.text
    }
  };
}

function tokenSimilarity(first, second) {
  const firstTokens = meaningfulTokens(first);
  const secondTokens = meaningfulTokens(second);
  const smaller = Math.min(firstTokens.size, secondTokens.size);
  if (smaller < 6) return 0;
  const shared = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  return shared / smaller;
}

function meaningfulTokens(text) {
  return new Set(
    normalizePurposeText(text)
      .split(/\s+/)
      .filter((token) => token.length > 4)
      .filter((token) => !TOKEN_STOP_WORDS.has(token))
      .filter((token) => !/^\d+$/.test(token))
  );
}

function normalizePurposeText(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9%$+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function any(text, fragments) {
  return fragments.some((fragment) => has(text, fragment));
}

function has(text, fragment) {
  return text.includes(normalizePurposeText(fragment));
}

function countMatches(text, fragments) {
  return fragments.filter((fragment) => has(text, fragment)).length;
}
