# Readability Checker

A readability checker for public service content, such as 311 help pages. Paste in a page to see its grade level against a target, and which sentences and words to fix.

It is one HTML file that runs entirely in the browser. Nothing you paste leaves your computer, so no vendor stores your drafts. There is nothing to install.

**To use it:** open `index.html` in a browser, or send the file to a coworker.

## What it does

- Scores text against a target grade that you set
- Shows Flesch-Kincaid, Automated Readability Index, Gunning Fog, SMOG, Coleman-Liau, and Flesch Reading Ease
- Shows a second score that leaves out agency names, phone numbers, and web addresses
- Highlights long and hard sentences, wordy phrases, passive voice, hard words, and adverbs
- Lists the sentences to fix first and suggests plainer wording
- Treats each heading, list item, and line as its own sentence, so an unpunctuated list doesn't inflate the score
- Keeps headings and lists when you paste from a web page or Word document

It doesn't check grammar, spelling, or tone, and it doesn't score Spanish yet. The English formulas don't apply to Spanish text.

## Privacy

The page can't send your text anywhere, and you can check this yourself:

1. **The browser blocks network access.** A Content-Security-Policy at the top of `index.html` tells the browser to refuse all network requests from the page.
2. **You can watch it.** Open your browser's developer tools, go to the Network tab, reload the page, and paste some text. No requests appear.
3. **The tests enforce it.** `npm test` fails if the policy is loosened, or if someone adds an external file or a network call.

Your draft isn't saved anywhere. It is gone when you close the page. Only your settings and personal word lists are kept, in that browser's local storage.

The input box turns off the browser's spell check, because some browsers send text to a cloud service to check it. The page can't control browser extensions, though. An extension with access to all sites can still read what's on the page. If your text is sensitive, use a browser profile without extensions.

## Set it up for your team

Edit the `team-config` block near the top of `index.html`, then share your copy of the file. You can change:

| Setting | What it does |
| --- | --- |
| `targetGrade` | The grade level writers aim for. It's 8 for now, so set it to your team's standard. |
| `headlineFormula` | The formula behind the main score |
| `longSentenceWords` | How many words make a sentence long. The default is 25. |
| `ignoreTerms` | Agency names and acronyms. They are never marked as hard words. |
| `familiarLongWords` | Long words most readers know, such as "information" |
| `replacements` | Bureaucratic wording and plainer choices |

The starter lists were written for this first version, and no team has reviewed them. Check them against your own style guide.

## How the scores work

| Formula | Calculation |
| --- | --- |
| Flesch Reading Ease | 206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words) |
| Flesch-Kincaid Grade | 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59 |
| Automated Readability Index | 4.71 × (letters / words) + 0.5 × (words / sentences) − 21.43 |
| Gunning Fog | 0.4 × ((words / sentences) + 100 × (complex words / words)) |
| SMOG | 1.043 × √(polysyllables × 30 / sentences) + 3.1291 |
| Coleman-Liau | 0.0588 × letters per 100 words − 0.296 × sentences per 100 words − 15.8 |

Scores are estimates, and they will differ a little from other tools:

- **Syllables** come from rules plus a list of exceptions. Numbers count one syllable per digit.
- **Each line ends a sentence.** Text with hard line breaks in the middle of sentences will score too low.
- **Short lines lower the score.** A page with many headings and list items can score easier than it reads.
- **Short text is unreliable.** Under 100 words, the page warns you.
- **Passive voice and adverbs** are pattern matches, so they will miss some cases and mark some wrongly.
- **A sentence is "hard"** when it has at least 10 words and scores 4 or more grades above the target on Flesch-Kincaid.
- **A word is "hard"** when it has 4 or more syllables and isn't on a team list.

Formulas measure sentence and word length. They don't show whether a reader can finish the task, so they don't replace testing with real readers.

## Working on the code

All the code is in `index.html`, so the file you test is the file you share. There is no build step, and the tests have no dependencies. They need Node 20 or later.

```bash
npm test
```

| Block in `index.html` | What it holds |
| --- | --- |
| `<script id="team-config">` | Team settings |
| `<script id="engine">` | Text analysis and formulas, with no page access. The tests run this block directly. |
| `<script id="ui">` | Page behavior |

If a word's syllable count is wrong, add it to `SYLLABLE_EXCEPTIONS` and add it to the table in `test/engine.test.js`.

When you test, use published pages or made-up text, not unpublished drafts.

## Related

[NYC311 Readability](https://cityofnewyork.github.io/accessibility-nyc/readability.html) reports formula scores for published NYC311 help articles. This tool does a different job: it checks a draft before it's published. No code is shared, because that repository has no license. Two ideas come from that page: the score without agency names and phone numbers, and the 25-word and 100-word thresholds.

## License

No license has been chosen yet. Decide this once you know which account will own the repository.
