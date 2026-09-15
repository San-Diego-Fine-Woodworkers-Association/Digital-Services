#!/usr/bin/env node

/**
 * Points this repo's apps at a local checkout of the design-system repo
 * (@sdwa/components, @sdwa/tokens) instead of the published npm versions,
 * for testing component changes before they're published.
 *
 * Usage:
 *   node scripts/link-design-system.js [app...]
 *
 * With no app names given, every app under apps/* that depends on
 * @sdwa/components or @sdwa/tokens is linked.
 *
 * After linking, run the app's dev/build scripts with SDWA_LOCAL_LINK=1 set
 * (e.g. `SDWA_LOCAL_LINK=1 bun run dev`) — Turbopack currently can't follow
 * the link across repos (see apps/auth/next.config.mjs for why), so linked
 * apps fall back to webpack for as long as they're linked.
 *
 * Run scripts/unlink-design-system.js to restore the published versions.
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

function findLinkedApps(explicitApps) {
  if (explicitApps.length > 0) return explicitApps;
  return fs.readdirSync(APPS_DIR).filter((name) => {
    const pkgPath = path.join(APPS_DIR, name, "package.json");
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return LINKED_PACKAGES.some((p) => pkg.dependencies?.[p]);
  });
}

function main() {
  const explicitApps = process.argv.slice(2);

  if (!fs.existsSync(DESIGN_SYSTEM_ROOT)) {
    console.error(
      `Expected a sibling checkout of design-system at ${DESIGN_SYSTEM_ROOT} — clone it there first.`,
    );
    process.exit(1);
  }

  console.log("Building design-system packages...");
  run("bun", ["run", "build"], DESIGN_SYSTEM_ROOT);

  console.log("\nRegistering bun links...");
  for (const pkg of LINKED_PACKAGES) {
    const pkgDir = path.join(DESIGN_SYSTEM_ROOT, "packages", pkg.split("/")[1]);
    run("bun", ["link"], pkgDir);
  }

  const apps = findLinkedApps(explicitApps);
  if (apps.length === 0) {
    console.error("No apps depend on @sdwa/components or @sdwa/tokens — nothing to link.");
    process.exit(1);
  }

  console.log(`\nPointing apps/{${apps.join(",")}} at the local checkout...`);
  for (const app of apps) {
    const pkgPath = path.join(APPS_DIR, app, "package.json");
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    let changed = false;
    for (const dep of LINKED_PACKAGES) {
      if (pkg.dependencies?.[dep] && pkg.dependencies[dep] !== `link:${dep}`) {
        pkg.dependencies[dep] = `link:${dep}`;
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

  console.log(`\nLinked. Run each app's dev/build with SDWA_LOCAL_LINK=1 set, e.g.:\n`);
  for (const app of apps) {
    const appDir = path.join(APPS_DIR, app);
    // @sdwa/tokens' theme.css does `@import "tailwindcss"`, resolved relative
    // to theme.css's real (symlinked) location in the design-system checkout,
    // which has no tailwindcss of its own — only this app does. NODE_PATH
    // makes that resolve too. Only needed while linked: a real npm-installed
    // @sdwa/tokens lives inside this app's own node_modules and doesn't need it.
    let nodePathHint = "";
    const bunStore = path.join(REPO_ROOT, "node_modules", ".bun");
    const tailwindDir = fs.existsSync(bunStore)
      ? fs.readdirSync(bunStore).find((name) => name.startsWith("tailwindcss@"))
      : undefined;
    if (tailwindDir) {
      nodePathHint = `NODE_PATH=${path.join(bunStore, tailwindDir, "node_modules")} `;
    }
    console.log(`  cd apps/${app} && ${nodePathHint}SDWA_LOCAL_LINK=1 bun run dev`);
  }
  console.log(
    `\nRebuild design-system after each source change (bun run build in design-system) to` +
      ` pick up the change — there's no watch mode wired up yet.\n` +
      `Run scripts/unlink-design-system.js when done.`,
  );
}

main();
