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

**Anything unsent shows in a sticky banner and on the Submit button itself**, not in a
toast. This matters because Submit opens WhatsApp, which takes the person off the page
entirely; a toast has always expired by the time they come back, so the only signal that
more was pending vanished at exactly the moment it was needed. The banner reads
`⚠️ 12 society bhejni baaki hai` with how many more presses it will take, the button reads
`Submit — 12 baaki hai` and turns amber, and both are rebuilt by `refresh()` on load, so
they survive closing the tab. Both clear only when nothing is left to send.

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
- **`r` is an ASK, and only an ask. Never a description of what we already hold.** Every
  "ye maintenance aa chuka hai, dobara mat bhariye" note was deleted on 20 August 2026. Those
  were hand-written snapshots of `projects.json`, so each went stale the moment a round was
  filed, and a stale one is worse than nothing: on 19 August a card said a field was empty
  while his own stored answer already filled it, so he sent it untouched and twenty-one
  societies came back byte-identical. **What is missing is derived instead** by `gaps()` and
  rendered by `gapLine()` into the `.rc.gap` block at the top of each card, computed from the
  same answers the questions render from, so it cannot go stale and cannot disagree with the
  form under it. Write an `r` only for what the answers cannot say for themselves: two rounds
  disagreed, or we need a document the form has no question for. Checks 11 and 12 in
  `selftest.mjs` guard both halves, and check 12 fails the build on a note that describes held
  data. Keep them rare, because a note on every card is a note on no card.
- **A society is on screen only while it is missing something.** `soc.r` used to force its
  card into `SHOWN`, which pinned a society there permanently once it had a note, even after
  every answer was in. Removed 20 August 2026. Nothing is lost, because a note that needs an
  answer always has an empty question under it: the re-check pass blanks the disputed answers,
  and an empty question shows the card through `!isDone`. So the list shrinks as the work gets
  done, which is the only progress signal the tool gives him.
- **Answer lists** live in `CORE`, `FLAT`, `PLOT`, `HR` and `EXTRA`. Adding an option is one
  array entry. Adding a question to `CORE` makes every completed society incomplete again,
  so add to `EXTRA` unless that is genuinely intended.
- **Two charge questions were added on 18 August 2026, and they do NOT reopen finished
  societies.** `nocw` (who pays the NOC or transfer charge) and `nocx` (what the society wants
  before it signs). `nocc` already asked what the charge IS; neither of the new ones could be
  inferred from it, and both decide a seller's net proceeds.

  The old warning in this file said adding to `CORE` makes every completed society incomplete,
  so add to `EXTRA` instead. Both halves of that are bad: `CORE` reads as lost work and drops
  the progress bar for something nobody did wrong, and `EXTRA` makes the question optional, so
  the data blocking the seller page never arrives. **That trade is now gone.** A question
  carrying **`since: 1`** is a full core question for the card, the WhatsApp message and the
  CSV, and is excluded from `isDone()`. Finished societies stay finished and stay sendable;
  the new questions are counted and chased separately, shown per card as
  `bhej diya · 2 naye sawaal` and in the progress line as `N me 2 naye sawaal baaki`.

  **Give any question added mid-survey a `since` flag.** It is the whole reason this is not a
  choice between annoying the team and not getting the answer. Guarded by check 7 in
  `selftest.mjs`, which asserts that a society completed before the new questions existed
  still reads as done while both new questions still count as pending.

  **The `since` flag also has to reach `SHOWN`, and on 18 August it did not.** The card list
  shows only what still needs work, and a finished, sent society was hidden. Excluding the
  new questions from `isDone` therefore hid the only place they could be answered: the header
  read `21 me 2 naye sawaal baaki` and pointed at twenty-one cards that were not on the page.
  The 19 August CSV came back with both questions blank on all twenty-one, and filled only on
  Nimai Greens, which had never been finished. `newPending(soc) > 0` is now part of the
  `SHOWN` filter. Check 8 in `selftest.mjs` guards it in both directions: the card appears
  while a new question is pending and hides again once it is answered.
- **Re-check passes clear the disputed answer; they do not annotate it.** Learned 19 August
  2026 on the ten conflicts in the website repo's `OWNER-DATA-REQUESTS.md` §2b. Those cards
  carried a note saying what the website was missing, while the question underneath it was
  already filled in with the answer that was in dispute. Nothing looked unanswered, so nothing
  got re-answered and the export repeated the previous round byte for byte. A note cannot
  reopen a filled question.

  The `RECHECK` table near the top of the script names the societies and the question ids to
  blank, and it runs **once**, behind `RECHECK_KEY` in `localStorage`. The guard is the whole
  design: a second pass would wipe the answers the pass exists to collect. **A future re-check
  adds a new dated key rather than reusing this one**, because reusing it silently does
  nothing. Check 9 in `selftest.mjs` covers both the clear and the once.
- **A contradictory answer stored before its fix shipped stays contradictory.** The 14 August
  coupling between the maintenance rate and the collector fires on `change`, so it repairs
  nothing that was answered earlier and never touched again. Ekta Enclave was exactly that
  and exported both halves on 19 August. There is now a repair pass on load, added 20 August 2026, that blanks the
  pair wherever it disagrees, keeping neither half, since there is no way to tell which is
  right. **Any future coupling between two controls needs the same pair: a handler for new
  answers and a repair pass for stored ones.** Check 10 in `selftest.mjs`.
- **Getting everything out at once, added 18 August 2026.** WhatsApp still sends one society
  per message, which is right while filing as you go and wrong when the whole survey has to
  move in one piece. Three additional routes:
  - **📥 File banao** writes a CSV, one row per society, one column per question, with a
    UTF-8 BOM so Excel does not mangle the Hinglish and the rupee signs. This is the one that
    actually solves the problem, because a CSV uploads to Drive as a Google Sheet with no
    retyping. The header is built from every question that exists anywhere, so a flat society
    and a plot society share a column layout.
  - **📧 Email** opens an addressed, titled mail and deliberately does NOT put the survey in
    the body. `mailto` has a length limit that varies by mail app and truncates silently past
    it, which is the same class of failure as the 11 August WhatsApp truncation. It tells the
    user to attach the CSV instead.
  - **📄 Google Doc** copies everything and opens a blank doc to paste into. A plain page
    cannot push text into a new Google Doc without signing in through Google, so a button
    claiming to create the doc would be pretending. Two taps, honestly labelled.
- **Storage key is `shivam-society-facts-v3`.** The v2 answers were free text and cannot be
  read back into the token format. Nothing was lost: everything filled on 11 August was
  already sent and is now in `projects.json`.
- **WhatsApp number** is `VIKAS_WA`, the same owner number the photo tool sends to, so every
  field reply lands in one thread. Deliberately NOT the public business number in the
  website's `src/config.ts`: this is internal data going to the owner, not an enquiry going
  to the sales line.
- **`Omaxe Medocity` is gone, resolved 13 August 2026.** Owner: *"Omaxe Green Meadow City is
  main."* The name came over from the photo tool and was never an Omaxe product: the 4 August
  audit checked Omaxe's own Bhiwadi list (Panorama City, Green Meadow City, Marigold,
  Sunrise, Europia) and found no Medocity. The website already 301s
  `/projects/omaxe-medocity/` to `/projects/omaxe-green-meadow-city/`. The photo tool's
  `PROJECTS` array still offers the old name, so photos can still be labelled with it until
  that list is updated too.
- The page is `noindex, nofollow`. It is a staff tool and must never be linked from
  propertydealersinbhiwadi.com.
