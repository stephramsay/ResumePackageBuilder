export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

export function paragraphHtml(paragraphs) {
  return paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("\n        ");
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function assetNamePart(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function sanitizeFinalText(value) {
  return String(value ?? "")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function todayDisplayDate() {
  const date = new Date();
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}
