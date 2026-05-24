import os from "node:os";
import path from "node:path";
import { assetNamePart } from "./strings.js";

export function defaultOutputRoot() {
  return path.join(os.homedir(), "Dev", "resume_packages");
}

export function expandHome(value) {
  const text = String(value ?? "");
  if (text === "~") return os.homedir();
  if (text.startsWith("~/")) return path.join(os.homedir(), text.slice(2));
  return text;
}

export function assertDefaultOutputRoot(outputRoot) {
  const resolved = path.resolve(expandHome(outputRoot));
  const expected = defaultOutputRoot();
  if (resolved !== expected && process.env.RESUME_PACKAGE_ALLOW_EXTERNAL_OUTPUT !== "1") {
    throw new Error(`Generated resume packages must be written under ${expected}. Received ${resolved}.`);
  }
  return resolved;
}

export function resolvePackageDir(packageDir) {
  const text = String(packageDir ?? "").trim();
  if (!text) throw new Error("Package directory is required.");
  const resolved = path.isAbsolute(expandHome(text))
    ? path.resolve(expandHome(text))
    : path.resolve(defaultOutputRoot(), text);
  assertPackageDirInsideRoot(resolved);
  return resolved;
}

export function assertPackageDirInsideRoot(packageDir) {
  const root = defaultOutputRoot();
  const resolved = path.resolve(expandHome(packageDir));
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Package directory must be inside ${root}. Received ${resolved}.`);
  }
  return resolved;
}

export function isInsidePackageDir(filePath, packageDir) {
  const relative = path.relative(path.resolve(packageDir), path.resolve(filePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function packageFileNames(content) {
  const company = assetNamePart(content.metadata.company);
  const role = assetNamePart(content.metadata.role_title);
  const prefix = `Stephanie_Ramsay_${company}_${role}`;
  return {
    websitePdf: `${prefix}_Website_PDF.pdf`,
    atsDocx: `${prefix}_Resume.docx`,
    atsPdf: `${prefix}_Resume.pdf`,
    coverDocx: `${prefix}_Cover_Letter.docx`,
    coverPdf: `${prefix}_Cover_Letter.pdf`
  };
}

export function packagePaths(packageDir, content) {
  const names = packageFileNames(content);
  return {
    indexHtml: path.join(packageDir, "index.html"),
    renderDir: path.join(packageDir, "render"),
    atsHtml: path.join(packageDir, "render", "ats-resume.html"),
    coverHtml: path.join(packageDir, "render", "cover-letter.html"),
    websitePdf: path.join(packageDir, names.websitePdf),
    atsDocx: path.join(packageDir, names.atsDocx),
    atsPdf: path.join(packageDir, names.atsPdf),
    coverDocx: path.join(packageDir, names.coverDocx),
    coverPdf: path.join(packageDir, names.coverPdf)
  };
}
