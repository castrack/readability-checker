// Guards the promise that text cannot leave the page.
const test = require("node:test");
const assert = require("node:assert/strict");
const { html, block } = require("./load.js");

test("the Content-Security-Policy still blocks all network access", () => {
  const match = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(match, "CSP meta tag is missing");
  const policy = match[1];
  assert.match(policy, /default-src 'none'/);
  assert.match(policy, /form-action 'none'/);
  assert.match(policy, /base-uri 'none'/);
  for (const directive of ["connect-src", "img-src", "font-src", "frame-src", "media-src"]) {
    assert.ok(!policy.includes(directive), `${directive} must stay covered by default-src 'none'`);
  }
  assert.doesNotMatch(policy, /https?:|\*/);
});

test("the policy comes before any script runs", () => {
  assert.ok(html.indexOf("Content-Security-Policy") < html.indexOf("<script"));
});

test("the file loads nothing external", () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link\b/i);
  assert.doesNotMatch(html, /<(?:img|iframe|video|audio|embed|object|form)\b/i);
  assert.doesNotMatch(html, /(?:src|href|action)\s*=\s*["']?\s*(?:https?:)?\/\//i);
  assert.doesNotMatch(html, /@import|url\(/i);
});

test("the scripts use no network or dynamic-code APIs", () => {
  const code = block("team-config") + block("engine") + block("ui");
  assert.doesNotMatch(code, /\bfetch\s*\(|\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker)\b|\bsendBeacon\b|\bimportScripts\b|\beval\s*\(|\bFunction\s*\(/);
  assert.doesNotMatch(code, /\.innerHTML|insertAdjacentHTML|document\.write/);
});

test("the draft is never written to storage", () => {
  const ui = block("ui");
  assert.equal((ui.match(/localStorage\.setItem/g) || []).length, 1);
  const save = ui.slice(ui.indexOf("function saveSettings"), ui.indexOf("function currentOptions"));
  assert.doesNotMatch(save, /input\.value/);
  assert.doesNotMatch(save, /\$\("input"\)/);
});

test("browser and extension text checks are turned off on the input", () => {
  const input = html.match(/<textarea id="input"[^>]*>/)[0];
  assert.match(input, /spellcheck="false"/);
  assert.match(input, /data-gramm="false"/);
});
