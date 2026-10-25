#!/usr/bin/env node
/**
 * Publish the giscus theme repo and pin the blog to the new commit.
 *
 * - commits + pushes this repo (main)
 * - updates the pinned theme version in the blog's Giscus component
 * - probes every variant on jsDelivr (never uses @main)
 *
 * Usage: node scripts/publish.mjs
 * Env:   BLOG_DIR=/path/to/blog
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = resolve(process.env.BLOG_DIR ?? resolve(ROOT, "../blog"));
const GISCUS_COMPONENT = resolve(BLOG_DIR, "src/components/Giscus.astro");
const VERSION_RE = /const GISCUS_THEME_VERSION = "([0-9a-f]{40})";/;

const VARIANTS = [
	"light.css",
	"dark.css",
	"light-noanim.css",
	"dark-noanim.css",
	"light-norounded.css",
	"dark-norounded.css",
	"light-norounded-noanim.css",
	"dark-norounded-noanim.css",
];

function fail(message) {
	console.error(`\n✖ ${message}`);
	process.exit(1);
}

function run(command, args) {
	try {
		return execFileSync(command, args, {
			cwd: ROOT,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
	} catch (error) {
		const detail = error.stderr?.toString().trim() || error.message;
		fail(`${command} ${args.join(" ")} failed\n${detail}`);
	}
}

function exitCode(command, args) {
	return spawnSync(command, args, { cwd: ROOT, stdio: "ignore" }).status;
}

// --- sanity checks ---------------------------------------------------------

if (exitCode("git", ["rev-parse", "--is-inside-work-tree"]) !== 0) {
	fail(`${ROOT} is not a git repository`);
}

const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== "main") {
	fail(`Expected branch "main", got "${branch}"`);
}

if (!existsSync(GISCUS_COMPONENT)) {
	fail(`Blog Giscus component not found: ${GISCUS_COMPONENT}`);
}

const initialComponent = readFileSync(GISCUS_COMPONENT, "utf8");
const initialVersions =
	initialComponent.match(/const GISCUS_THEME_VERSION = "[0-9a-f]{40}";/g) ?? [];
if (initialVersions.length !== 1) {
	fail(
		`Expected exactly one GISCUS_THEME_VERSION in ${GISCUS_COMPONENT}, ` +
			`found ${initialVersions.length}. Wire the blog first.`,
	);
}

const basePrefix = initialComponent.match(
	/const GISCUS_THEME_BASE = `([^`]*)\$\{GISCUS_THEME_VERSION\}`;/,
)?.[1];
if (!basePrefix) {
	fail(
		`Could not read GISCUS_THEME_BASE from ${GISCUS_COMPONENT}. ` +
			"Expected a template literal containing ${GISCUS_THEME_VERSION}.",
	);
}

const blogConfig = readFileSync(resolve(BLOG_DIR, "src/config.ts"), "utf8");
const blogHue = blogConfig.match(/hue:\s*(\d+)/)?.[1];
const themeHue = readFileSync(resolve(ROOT, "light.css"), "utf8").match(
	/giscus-hue:\s*(\d+)/,
)?.[1];

if (!blogHue || !themeHue) {
	fail("Could not read the hue from the blog config or /* giscus-hue: ... */");
}
if (blogHue !== themeHue) {
	fail(
		`Hue mismatch: blog=${blogHue}, theme=${themeHue}. ` +
			"Update the theme CSS and its /* giscus-hue */ marker before publishing.",
	);
}

// --- commit + push ---------------------------------------------------------

run("git", ["add", "-A"]);
const hasChanges = exitCode("git", ["diff", "--cached", "--quiet"]) === 1;

if (hasChanges) {
	run("git", [
		"commit",
		"-m",
		`chore: publish giscus themes ${new Date().toISOString()}`,
	]);
	console.log("committed theme changes");
} else {
	console.log("no theme changes to commit");
}

console.log("pushing origin main ...");
run("git", ["push", "origin", "main"]);

const sha = run("git", ["rev-parse", "HEAD"]);
if (!/^[0-9a-f]{40}$/.test(sha)) {
	fail(`Unexpected commit hash: ${sha}`);
}

// --- pin the blog ----------------------------------------------------------

const component = readFileSync(GISCUS_COMPONENT, "utf8");
const versions =
	component.match(/const GISCUS_THEME_VERSION = "[0-9a-f]{40}";/g) ?? [];
if (versions.length !== 1) {
	fail(
		`Expected exactly one GISCUS_THEME_VERSION in ${GISCUS_COMPONENT}, ` +
			`found ${versions.length}.`,
	);
}

const updatedComponent = component.replace(
	VERSION_RE,
	`const GISCUS_THEME_VERSION = "${sha}";`,
);
writeFileSync(GISCUS_COMPONENT, updatedComponent);

console.log(`\npinned ${sha} -> ${GISCUS_COMPONENT}`);

// --- verify CDN ------------------------------------------------------------

const base = `${basePrefix}${sha}`;

async function probe(url) {
	for (let attempt = 1; attempt <= 15; attempt++) {
		try {
			const response = await fetch(url, { cache: "no-store" });
			await response.text();
			if (response.ok) return response.status;
		} catch {
			// network hiccup, retry
		}
		await new Promise((resolve) => setTimeout(resolve, 1500));
	}
	return null;
}

console.log("\nverifying jsDelivr ...");
for (const variant of VARIANTS) {
	const url = `${base}/${variant}`;
	const status = await probe(url);
	if (!status) fail(`CDN probe failed after retries: ${url}`);
	console.log(`  ${status}  ${url}`);
}

console.log("\n✔ published");
