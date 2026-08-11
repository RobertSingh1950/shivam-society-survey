# Shivam Properties — Society Facts Collector

A single-page team tool for collecting the four society facts that no property portal
carries, plus the comparison question that tells us which societies buyers weigh against
each other.

Live: `https://robertsingh1950.github.io/shivam-society-survey/`

Same pattern as `shivam-review-generator`: one `index.html`, no build step, no backend, no
dependencies. Open it on a phone, fill it, tap the WhatsApp button.

## Why it exists

The website's project pages are governed by
`docs/ops/SOCIETY-ASSESSMENT.md` in the `propertydealersinbhiwadi` repo. That rubric has
eight dimensions, and four of them cannot be researched from a desk:

1. Maintenance charge, and who collects it
2. Whether an RWA is formed and registered
3. Transfer NOC timeline and charge
4. Which banks lend on the society

These four decide whether a buyer loses money, and no portal publishes them. They are the
only part of the site a competitor cannot copy. This tool is how they get collected.

## What it does

Built on the same pattern as `shivam-photo-review`, deliberately: all items on one page,
sticky progress counter, autosave on every keystroke, and one Submit in a fixed bottom bar.
Sanjay ji already knows how that tool behaves, so this one behaves the same way.

- **All 22 societies on one page**, each a collapsible card. The progress bar reads
  `X / 22 society done`, so the job is visibly a list to finish rather than a form to fill
  once.
- Question set changes by property kind: a plotted township gets asked about internal roads,
  water, electricity and whether BIDA or UIT has taken handover, instead of lifts and the
  club house
- Every question has a **"pata nahi"** toggle, which is recorded as a real answer
- Records whether the person went to the site themselves, which is what lets the website say
  "we saw this ourselves" and sets the evidence tier
- Autosaves to the browser, so a half-filled page survives closing the tab
- Submit sends to the owner's WhatsApp, the same number the photo tool uses

## The design decisions that matter

**"Pata nahi" is a first-class answer, not an empty field.** A question nobody asked and a
question answered "we do not know" are different things. The first is a gap in the survey;
the second is a fact about what we can honestly publish, and it goes on the website under
"what we could not verify". That section does the business more good than a guessed number
ever could, and this is why the tool nags about it twice.

**PATA NAHI is written in capitals in the outgoing message.** It must be impossible to
mistake for a blank line at the filing end.

**No client names, no phone numbers, no seller prices.** This tool is about buildings, not
about people. The in-app guide says so explicitly. Anything about a seller belongs in
private records, never in a survey that gets pasted into a repository.

**A society counts as done only when every question is answered or explicitly marked "pata
nahi".** Half-filled does not tick the card. The progress bar exists to drive the list to
completion, not to reward a good start, and the owner's instruction was that all societies
get covered rather than one or two.

**Submit sends only the completed, not-yet-sent societies, then marks them sent.** All 22
societies in a single message would run past what a `wa.me` link can carry, and WhatsApp
truncates silently, which is the worst failure available here because it still looks sent.
Editing an answer clears the sent flag so the correction goes out on the next Submit.

## Filing the replies

Paste each reply into `docs/ops/templates/society-intake.csv` in the website repo, one row
per dimension. Evidence tier follows what the message says about how it was found:

| Message says | Tier |
| --- | --- |
| "main khud gaya tha" | B, our own observation |
| "society office / guard se pucha" | C, reported |
| neither | leave blank, which means it does not publish yet |

## Maintenance

- **Society list** lives in the `SOCIETIES` array in `index.html`. Keep it in step with
  `src/data/projects.json` in the website repo when a project is added there. Nothing links
  the two files automatically.
- **WhatsApp number** is the `VIKAS_WA` constant, the same owner number `shivam-photo-review`
  sends to, so every field reply lands in one thread. It is deliberately NOT the public
  business number from the website's `src/config.ts`: this is internal data going to the
  owner, not an enquiry going to the sales line.
- **Open question for the owner:** the list carries both `Omaxe Medocity` (from the photo
  tool) and `Omaxe Green Meadow City` (from `projects.json`). These may be the same township
  under two names. Confirm and drop one.
- The page is `noindex, nofollow`. It is a staff tool and must never be linked from
  propertydealersinbhiwadi.com.
