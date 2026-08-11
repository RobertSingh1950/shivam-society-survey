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

- One society at a time, picked from the list we already hold in `src/data/projects.json`
- Question set changes by property kind: a plotted township gets asked about internal roads,
  water, electricity and whether BIDA or UIT has taken handover, instead of lifts and the
  club house
- Every question has a **"pata nahi"** toggle, which is recorded as a real answer
- Records whether the person went to the site themselves, which is what lets the website say
  "we saw this ourselves" and sets the evidence tier
- Saves progress in the browser, so a half-filled society survives closing the tab
- Builds a labelled WhatsApp message and opens it, ready to send

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

**The date is asked for, not assumed.** A fact collected in March and filed in August is a
March fact. The website prints the date beside the finding.

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
- **WhatsApp number** is the `SEND_TO` constant, copied from `NAP_WHATSAPP` in the website's
  `src/config.ts`. If it changes there, change it here too. It will not follow.
- The page is `noindex, nofollow`. It is a staff tool and must never be linked from
  propertydealersinbhiwadi.com.
