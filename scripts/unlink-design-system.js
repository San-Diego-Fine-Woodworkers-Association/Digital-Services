#!/usr/bin/env node

/**
 * Reverses scripts/link-design-system.js: points apps back at the published
 * @sdwa/components / @sdwa/tokens versions and reinstalls.
 *
 * Usage:
 *   node scripts/unlink-design-system.js [app...]
 *
 * With no app names given, every app under apps/* currently linked
 * (dependency value starting with "link:") is unlinked.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const APPS_DIR = path.join(REPO_ROOT, "apps");
const DESIGN_SYSTEM_ROOT = path.join(REPO_ROOT, "..", "design-system");
const LINKED_PACKAGES = ["@sdwa/tokens", "@sdwa/components"];

function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(" ")}  (in ${path.relative(REPO_ROOT, cwd) || "."})`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

function publishedVersionRange(pkgName) {
  const pkgDir = path.join(DESIGN_SYSTEM_ROOT, "packages", pkgName.split("/")[1]);
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  return `^${pkg.version}`;
}

function findLinkedApps(explicitApps) {
  if (explicitApps.length > 0) return explicitApps;
  return fs.readdirSync(APPS_DIR).filter((name) => {
    const pkgPath = path.join(APPS_DIR, name, "package.json");
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return LINKED_PACKAGES.some((p) => pkg.dependencies?.[p]?.startsWith("link:"));
  });
}

function main() {
  const explicitApps = process.argv.slice(2);
  const apps = findLinkedApps(explicitApps);

  if (apps.length === 0) {
    console.log("No linked apps found — nothing to do.");
    return;
  }

  console.log(`Restoring published versions in apps/{${apps.join(",")}}...`);
  for (const app of apps) {
    const pkgPath = path.join(APPS_DIR, app, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    let changed = false;
    for (const dep of LINKED_PACKAGES) {
      if (pkg.dependencies?.[dep]?.startsWith("link:")) {
        pkg.dependencies[dep] = publishedVersionRange(dep);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      console.log(`  updated ${path.relative(REPO_ROOT, pkgPath)}`);
    }
  }

  console.log("\nInstalling...");
  run("bun", ["install"], REPO_ROOT);

  console.log("\nUnlinked. Back on the published @sdwa/components / @sdwa/tokens versions.");
}

main();
