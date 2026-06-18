"use strict";

const path = require("path");
const esbuild = require("esbuild");

const rootDir = path.resolve(__dirname, "..");
const minify = process.argv.includes("--minify");
const suffix = minify ? ".min" : ".built";

const entryPoints = [
  { in: path.join(rootDir, "bootstrap.js"), out: `bootstrap${suffix}` },
  { in: path.join(rootDir, "main.js"), out: `main${suffix}` },
];

esbuild
  .build({
    entryPoints,
    outdir: path.join(rootDir, "dist"),
    bundle: false,
    minify,
    sourcemap: true,
    target: ["es2020"],
    platform: "browser",
    legalComments: "none",
    logLevel: "info",
  })
  .catch(() => {
    process.exitCode = 1;
  });
