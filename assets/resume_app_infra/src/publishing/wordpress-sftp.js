import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureDir, pathExists, readJson } from "../lib/files.js";
import { validatePackage } from "../validators/validate-package.js";

const execFileAsync = promisify(execFile);

export async function publishWordPress(packageDir, options = {}) {
  const content = await readJson(path.join(packageDir, "approved-content.json"));
  const slug = content.metadata.slug;
  const localIndex = path.join(packageDir, "index.html");
  const host = options.host ?? "ssh.wp.com";
  const username = options.username ?? "stephanieramsay.wordpress.com";
  const remoteDir = `/htdocs/${slug}`;
  const remotePath = `${remoteDir}/index.html`;
  const publicUrl = `https://stephanieramsay.com/${slug}/`;
  const remoteStatus = await remoteRouteStatus(slug, { host, username });

  if (!await pathExists(localIndex)) {
    throw new Error(`Cannot publish because ${localIndex} does not exist.`);
  }

  const validation = await validatePackage(packageDir);
  if (!validation.passed) {
    throw new Error("Cannot publish because package validation failed. Fix verification-summary.md before publishing.");
  }

  const plan = {
    mode: options.execute ? "execute" : "dry-run",
    local_index: localIndex,
    remote: `${username}@${host}:${remotePath}`,
    public_url: publicUrl,
    remote_route: remoteStatus
  };

  if (!options.execute) {
    return {
      ...plan,
      status: "dry-run",
      message: "Dry run only. Re-run with --execute after SSH/SFTP credentials are available and publishing is approved."
    };
  }

  if (process.env.RESUME_PACKAGE_ENABLE_PUBLISH !== "1") {
    throw new Error("Publishing is gated. Set RESUME_PACKAGE_ENABLE_PUBLISH=1 and pass --execute to publish.");
  }

  const tmpDir = path.join(packageDir, "tmp");
  await ensureDir(tmpDir);
  const batchFile = path.join(tmpDir, `resume-package-sftp-${Date.now()}.batch`);
  const batch = `-mkdir ${remoteDir}\nput ${localIndex} ${remotePath}\nbye\n`;
  await fs.writeFile(batchFile, batch, "utf8");
  try {
    const { stdout, stderr } = await execFileAsync("sftp", [
      "-o", "ConnectTimeout=20",
      "-b", batchFile,
      `${username}@${host}`
    ], {
      timeout: 120000,
      maxBuffer: 1024 * 1024
    });
    const verification = await verifyPublicUrl(publicUrl);
    return {
      ...plan,
      status: verification.ok ? "published" : "uploaded-unverified",
      verified_live: verification.ok,
      verification,
      stdout,
      stderr
    };
  } finally {
    await fs.rm(batchFile, { force: true });
  }
}

export async function remoteRouteExists(slug, options = {}) {
  const status = await remoteRouteStatus(slug, options);
  return status.exists === true;
}

export async function remoteRouteStatus(slug, options = {}) {
  const host = options.host ?? "ssh.wp.com";
  const username = options.username ?? "stephanieramsay.wordpress.com";
  const safeSlug = String(slug ?? "").replace(/[^a-z0-9-]/gi, "");
  if (!safeSlug) return { checked: false, exists: false, error: "Missing route name." };

  try {
    await execFileAsync("ssh", [
      "-o", "ConnectTimeout=15",
      "-o", "NumberOfPasswordPrompts=0",
      `${username}@${host}`,
      `test -d /srv/htdocs/${safeSlug} || test -d "$HOME/htdocs/${safeSlug}"`
    ], {
      timeout: 20000,
      maxBuffer: 128 * 1024
    });
    return { checked: true, exists: true, remote_dir: `/htdocs/${safeSlug}` };
  } catch (error) {
    if (error.code === 1) {
      return { checked: true, exists: false, remote_dir: `/htdocs/${safeSlug}` };
    }
    return { checked: false, exists: false, error: error.message };
  }
}

async function verifyPublicUrl(publicUrl) {
  try {
    const response = await fetch(publicUrl, { method: "GET", cache: "no-store" });
    const text = await response.text();
    return {
      ok: response.ok && text.includes("Stephanie Ramsay"),
      status: response.status,
      contains_stephanie_ramsay: text.includes("Stephanie Ramsay")
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}
