// Runs the real code out of index.html, so the file people share is the file under test.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function block(id) {
  const match = html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`));
  if (!match) throw new Error(`No <script id="${id}"> block in index.html`);
  return match[1];
}

const context = vm.createContext({ window: {} });
vm.runInContext(block("team-config"), context);
vm.runInContext(block("engine"), context);

// Round-trip through JSON where needed: objects made in a vm context have a
// different Object prototype, which strict deepEqual rejects.
module.exports = {
  html,
  block,
  Engine: context.ReadabilityEngine,
  config: context.window.READABILITY_CONFIG,
  plain: (value) => JSON.parse(JSON.stringify(value)),
};
