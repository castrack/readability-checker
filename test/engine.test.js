const test = require("node:test");
const assert = require("node:assert/strict");
const { Engine, config } = require("./load.js");

const close = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 0.01, `${msg}: got ${actual}, expected ${expected}`);

const sentencesOf = (text, options) => Array.from(Engine.analyze(text, options).sentences, (s) => s.text);

// ---- Syllables ------------------------------------------------------------
test("syllable counts for common words", () => {
  const expected = {
    the: 1, cat: 1, make: 1, time: 1, call: 1, home: 1, while: 1, free: 1, house: 1,
    table: 2, people: 2, water: 2, city: 2, notice: 2, pickup: 2, parking: 2, payment: 2,
    statement: 2, useful: 2, safely: 2, homeless: 2, rules: 1, makes: 1, tables: 2, changes: 2,
    houses: 2, used: 1, walked: 1, wanted: 2, needed: 2, agreed: 2, going: 2, doing: 2, paying: 2,
    trying: 2, service: 2, services: 3, license: 2, business: 2, apartment: 3, department: 3,
    someone: 2, everything: 3, different: 2, family: 3, management: 3, government: 3,
    document: 3, requirement: 3, schedule: 2, tenant: 2, landlord: 2, complaint: 2,
    radio: 3, media: 3, actual: 3, individual: 5, usual: 3, area: 3, idea: 3, create: 2,
    information: 4, application: 4, community: 4, available: 4, emergency: 4, violation: 4,
    sanitation: 4, transportation: 4, immediately: 5, identification: 6,
    education: 4, medical: 3, benefits: 3, resident: 3, residents: 3, program: 2,
  };
  const wrong = Object.entries(expected)
    .map(([word, count]) => [word, count, Engine.countSyllables(word)])
    .filter(([, count, got]) => count !== got)
    .map(([word, count, got]) => `${word}: expected ${count}, got ${got}`);
  assert.deepEqual(wrong, []);
});

test("syllable counts for contractions, numbers, acronyms, and compounds", () => {
  assert.equal(Engine.countSyllables("don't"), 1);
  assert.equal(Engine.countSyllables("couldn't"), 2);
  assert.equal(Engine.countSyllables("isn't"), 2);
  assert.equal(Engine.countSyllables("tenant's"), 2);
  assert.equal(Engine.countSyllables("311"), 3);
  assert.equal(Engine.countSyllables("HPD"), 3);
  assert.equal(Engine.countSyllables("DSNY"), 4);
  assert.equal(Engine.countSyllables("WATER"), 2);
  assert.equal(Engine.countSyllables("low-income"), 3);
  assert.equal(Engine.countSyllables("10-Day"), 3);
});

// ---- Formulas -------------------------------------------------------------
test("formulas match hand-calculated values", () => {
  // "The cat sat on the mat." 6 words, 1 sentence, 6 syllables, 17 letters.
  const { scores, counts } = Engine.analyze("The cat sat on the mat.");
  assert.equal(counts.words, 6);
  assert.equal(counts.sentences, 1);
  assert.equal(counts.syllables, 6);
  assert.equal(counts.letters, 17);
  close(scores.fleschReadingEase, 116.145, "Flesch Reading Ease");
  close(scores.fleschKincaid, -1.45, "Flesch-Kincaid");
  close(scores.ari, -5.085, "ARI");
  close(scores.gunningFog, 2.4, "Gunning Fog");
  close(scores.smog, 3.1291, "SMOG");
  close(scores.colemanLiau, -4.073, "Coleman-Liau");
});

test("empty input gives no scores instead of NaN", () => {
  for (const text of ["", "   \n\n ", "---", "- "]) {
    const result = Engine.analyze(text);
    assert.equal(result.scores, null, JSON.stringify(text));
    assert.equal(result.sentences.length, 0);
  }
});

// ---- Sentence splitting ---------------------------------------------------
test("abbreviations, decimals, and web addresses do not end a sentence", () => {
  const cases = [
    "Dr. Lee works at 25 Main St. in Queens.",
    "Bring ID, e.g. a passport or license.",
    "The fee is $3.50 per bag.",
    "Visit nyc.gov/311 for details.",
    "Mail it to the U.S. Postal Service today.",
    "Ask for form No. 5 at the desk.",
    "Ask J. Smith for help.",
    "Offices open at 9 a.m. Monday through Friday.",
  ];
  for (const text of cases) assert.deepEqual(sentencesOf(text), [text]);
});

test("real sentence ends still split", () => {
  assert.deepEqual(sentencesOf("Call us. We can help!  Do you need more time? Ask."), [
    "Call us.", "We can help!", "Do you need more time?", "Ask.",
  ]);
  assert.deepEqual(sentencesOf('He said "stop." Then he left.'), ['He said "stop."', "Then he left."]);
  assert.deepEqual(sentencesOf("Pickup ends at 3 p.m. Call to book."), ["Pickup ends at 3 p.m.", "Call to book."]);
  assert.deepEqual(sentencesOf("The answer is no. Call us."), ["The answer is no.", "Call us."]);
});

// ---- Page structure -------------------------------------------------------
test("each list item and heading is its own unit, without its marker", () => {
  const text = [
    "# Bulk items",
    "You need:",
    "- Proof of address",
    "* A photo ID",
    "• A utility bill",
    "1. Call 311",
    "2) Give your address",
  ].join("\n");
  assert.deepEqual(sentencesOf(text), [
    "Bulk items", "You need:", "Proof of address", "A photo ID", "A utility bill", "Call 311", "Give your address",
  ]);
});

test("list-aware splitting lowers the score of an unpunctuated list", () => {
  const items = ["Proof of address", "Photo identification", "Utility bill", "Lease agreement", "Bank statement"];
  const asList = Engine.analyze(items.map((i) => `- ${i}`).join("\n"));
  const asRun = Engine.analyze(items.join(" "));
  assert.equal(asList.counts.sentences, 5);
  assert.equal(asRun.counts.sentences, 1);
  assert.ok(asList.scores.fleschKincaid < asRun.scores.fleschKincaid);
});

// ---- Team word lists ------------------------------------------------------
test("agency names and phone numbers are not hard words and leave the adjusted score", () => {
  const text = "Call the Department of Housing Preservation and Development at 212-555-0100 today.";
  const options = { ignoreTerms: ["Department of Housing Preservation and Development"] };
  const result = Engine.analyze(text, options);
  assert.equal(result.markCounts.hardWord, 0);
  assert.equal(result.counts.words, 11);
  assert.equal(result.adjustedCounts.words, 4); // Call, the, at, today
  assert.ok(result.adjustedScores.ari < result.scores.ari);
});

test("all-caps terms match exact case", () => {
  const options = { ignoreTerms: ["OATH"] };
  const exempt = (text) => Engine.analyze(text, options).adjustedCounts.words;
  assert.equal(exempt("Contact OATH now"), 2);
  assert.equal(exempt("Take an oath now"), 4);
});

test("a sentence made only of exempt terms drops out of the adjusted score", () => {
  const result = Engine.analyze("Call us today.\n212-555-0100", {});
  assert.equal(result.counts.sentences, 2);
  assert.equal(result.adjustedCounts.sentences, 1);
});

test("wordy phrases get plainer suggestions, using the team list", () => {
  const result = Engine.analyze(
    "Prior to your visit, utilizing the form is useful. In  accordance with the rules, we help.",
    { replacements: config.replacements },
  );
  const found = Object.fromEntries(result.suggestions.map((s) => [s.term, s.suggestion]));
  assert.equal(found["prior to"], "before");
  assert.equal(found["utilize"], "use");
  assert.equal(found["in accordance with"], "under, or following");
});

test("wordy phrases only match whole words", () => {
  const result = Engine.analyze("The shallow pool closes.", { replacements: { shall: "must" } });
  assert.equal(result.markCounts.wordy, 0);
});

// ---- Style checks ---------------------------------------------------------
test("passive voice heuristic", () => {
  const passive = (text) => Engine.analyze(text).markCounts.passive;
  assert.equal(passive("The form was submitted by the tenant."), 1);
  assert.equal(passive("Fees are not charged."), 1);
  assert.equal(passive("Your request is quickly reviewed."), 1);
  assert.equal(passive("The bill was paid."), 1);
  assert.equal(passive("The tenant submitted the form."), 0);
  assert.equal(passive("The office is closed."), 0);
  assert.equal(passive("It is indeed free."), 0);
});

test("adverb check skips common -ly words that are not adverbs", () => {
  const adverbs = (text) => Engine.analyze(text).markCounts.adverb;
  assert.equal(adverbs("Please carefully read this."), 1);
  assert.equal(adverbs("Only apply in July for your family."), 0);
});

test("long and hard sentences are flagged and ranked", () => {
  const long = Array(30).fill("cat").join(" ") + ".";
  const hard = "Administrative organizations necessitate comprehensive documentation regarding municipal regulatory compliance procedures annually.";
  const result = Engine.analyze(`${long}\nCall us.\n${hard}`, { targetGrade: 8 });
  assert.deepEqual(Array.from(result.sentences[0].flags), ["long"]);
  assert.deepEqual(Array.from(result.sentences[1].flags), []);
  assert.deepEqual(Array.from(result.sentences[2].flags), ["hard"]);
  assert.equal(result.priorities[0].index, 2);
  assert.equal(result.longSentences, 1);
  assert.equal(result.hardSentences, 1);
});

test("marks never overlap and always fall inside the text", () => {
  const text = "In accordance with rules, requests are carefully submitted prior to administrative determinations.";
  const result = Engine.analyze(text, { replacements: config.replacements });
  assert.ok(result.marks.length > 2);
  result.marks.reduce((previousEnd, mark) => {
    assert.ok(mark.start >= previousEnd);
    assert.ok(mark.end <= text.length);
    return mark.end;
  }, 0);
});

test("Windows line endings are handled", () => {
  assert.deepEqual(sentencesOf("- One thing\r\n- Two things\r\n"), ["One thing", "Two things"]);
});

test("the team settings are valid", () => {
  assert.ok(config.targetGrade > 0);
  assert.ok(Array.isArray(config.ignoreTerms) && config.ignoreTerms.length > 0);
  const result = Engine.analyze("Prior to use, call DSNY.", config);
  assert.equal(result.markCounts.wordy, 1);
});
