# Shivam Properties — Society Facts Collector

A single-page team tool for collecting the facts about a society that no property portal
carries. Open it on a phone, tap through the lists, tap Submit.

Live: `https://robertsingh1950.github.io/shivam-society-survey/`

Same pattern as `shivam-review-generator` and `shivam-photo-review`: one `index.html`, no
build step, no backend, no dependencies.

## Why it exists

The website's project pages are governed by `docs/ops/SOCIETY-ASSESSMENT.md` in the
`propertydealersinbhiwadi` repo. That rubric has eight dimensions and four of them cannot be
researched from a desk:

1. Maintenance charge, and who collects it
2. Whether an RWA is formed and registered
3. Transfer NOC timeline and charge
4. Which banks lend on the society

These decide whether a buyer loses money, and no portal publishes them. They are the only
part of the site a competitor cannot copy.

## Tap, do not type (rewritten 13 August 2026)

The first version asked six free-text questions per society, and a later pass added six
more. That is up to 264 typed answers on a phone keyboard, and it was the root of every
other problem the tool had:

- Free text made each answer long, so each message was long.
- Long messages had to be split into parts, so Submit had to be pressed up to 22 times.
- Long messages made silent WhatsApp truncation possible in the first place.
- Typing is slow, so the list did not get finished.

The photo tool never had any of these problems, because it asks for a `<select>` choice
rather than a sentence. This tool now works the same way. Almost every question is a list to
choose from or a row of chips to tap, and an answer arrives as a short token rather than a
sentence. Everything downstream got smaller as a direct result:

| | Before | After |
| --- | --- | --- |
| Typed answers for 22 societies | up to 264 | 0 required |
| Submit presses, all 22 filled | 11 to 22 | **4** |
| Longest message, encoded | near the cap | comfortably under |

**"Pata nahi" is the first option in every list**, not a separate checkbox. It remains a
first-class answer, which is the rule that matters, and it now costs one tap in the same
control rather than a reach to a different one. A question nobody asked and a question
answered "we do not know" are still different things: the first is a gap in the survey, the
second is a fact that publishes on the website under "what we could not verify".

**Every list that needs precision has a "koi aur" escape**, exactly like the photo tool's
project dropdown. Bands would have flattened ₹2 and ₹2.25 into one answer, and that
difference is real in the Terra societies. Picking "koi aur" opens a text box.

**Multi-select chips clear on "pata nahi".** Knowing nothing and knowing four things cannot
both be true, so tapping "pata nahi" in the bank or services row deselects the rest.

## The other design decisions

**A society counts as done only when every core question is answered**, and "pata nahi"
counts. Half-filled does not tick the card. The progress bar drives the list to completion
rather than rewarding a good start.

**The Extra block is optional and excluded from the done count.** It collects what the
website's comparison pages need and `projects.json` does not carry: possession period,
whether we hold stock, locality, rent. Nineteen societies were completed on 11 August;
making these required would have flipped all nineteen back to incomplete and re-queued them,
punishing work already done and making the progress bar lie.

**No client names, no phone numbers, no seller prices.** This tool is about buildings, not
people. Anything about a seller belongs in private records.

**Submit sends only completed, not-yet-sent societies, then marks them sent.** Editing an
answer clears the flag so the correction goes out next time.

## The message length trap

Worth understanding before anyone touches the cap.

What travels is `wa.me/<number>?text=<encoded>`, and percent-encoding inflates the payload
by a factor that depends on the script it was typed in:

| Typed in | Inflation | 1800 raw chars becomes |
| --- | --- | --- |
| Hinglish, Latin letters | ~1.6x | ~2,900 encoded |
| Hindi, Devanagari | **~7.8x** | **~14,000 encoded** |

The message that silently truncated on 11 August 2026 measured about **15,400 encoded
characters**. The original fix capped the *raw* message at 1800, which was measuring the
wrong string: safe in Hinglish, and landing on the truncation point the first time anyone
answered in Devanagari.

`MAX_URL` is 3500 measured on the encoded URL. Tokens made answers small enough that this
rarely splits now, but the guard stays, because a truncated message still looks sent.

**Every message carries a part number and a closing line.** The header reads
`(part 2 · 6 society)` and the message ends `--- khatam, 6 society ---`. Without these, a
truncated message and a message that never arrived both look identical to "nothing sent
yet", which is how three societies disappeared on 11 August. The counter lives in its own
`shivam-society-part` key and only increments.

**For a big batch, use Copy.** The clipboard has no URL limit, so 📋 Copy takes every
pending society at once and cannot truncate. Submit is convenient; Copy is safe.

## Filing the replies

Paste each reply into `docs/ops/templates/society-intake.csv` in the website repo, one row
per dimension. The message uses short keys (`maint`, `kaun`, `RWA`, `NOC time`,
`NOC charge`, `bank`, `services`, `club`, `handover`, `possession`, `stock`, `jagah`,
`kiraya`, `aur`) which map to that file's `dimension` column.

Evidence tier follows what the message says about how it was found:

| Message says | Tier |
| --- | --- |
| `khud gaya` | B, our own observation |
| `office se pucha` | C, reported |
| neither | leave blank, which means it does not publish yet |

## Maintenance

- **Society list** lives in the `SOCIETIES` array in `index.html`. Keep it in step with
  `src/data/projects.json` in the website repo. Nothing links the two automatically.
- **Answer lists** live in `CORE`, `FLAT`, `PLOT`, `HR` and `EXTRA`. Adding an option is one
  array entry. Adding a question to `CORE` makes every completed society incomplete again,
  so add to `EXTRA` unless that is genuinely intended.
- **Storage key is `shivam-society-facts-v3`.** The v2 answers were free text and cannot be
  read back into the token format. Nothing was lost: everything filled on 11 August was
  already sent and is now in `projects.json`.
- **WhatsApp number** is `VIKAS_WA`, the same owner number the photo tool sends to, so every
  field reply lands in one thread. Deliberately NOT the public business number in the
  website's `src/config.ts`: this is internal data going to the owner, not an enquiry going
  to the sales line.
- **Open question for the owner:** the list carries both `Omaxe Medocity` (from the photo
  tool) and `Omaxe Green Meadow City` (from `projects.json`). These may be the same township
  under two names. Confirm and drop one.
- The page is `noindex, nofollow`. It is a staff tool and must never be linked from
  propertydealersinbhiwadi.com.
