# A pilot on the phones you already have

One service line. No account, no hosted database, and no upload.

## What staff use

Each tech keeps a book on their own phone. A surgeon has procedures. A procedure has the setup, the trays, the sutures, and the nicknames. The hospital’s official preference card stays the card of record. The app can store a pointer to it.

When a case is worth handing off, share that procedure. The message reads like the card. The next phone shows that glance and saves it unconfirmed. Someone who was in the room confirms it with their name and the time. That confirmation goes stale. A short card can also travel as a code. The morning list — time, room, surgeon, procedure — stays on this phone and opens the matching card.

Export a JSON backup before a phone is replaced. Sample cards stay on the device that previewed them.

A tech who leaves a facility can hand off that place as one file from Places, then archive or delete it. One person on the unit can publish a place as a unit book. Staff import each new revision from a file; unit surgeons stay read-only on their phones, and a card that did not change keeps its match.

## What is not in the product

- A shared login, a facility code, or a standing password
- A server that stores the book
- Patients, record numbers, dates of birth, photos, implant lots, or serials
- Medication doses
- Copied instructions for use or technique guides
- Prices, rebates, or custom-pack contracts
- A score of individual techs

## What has to be true before real cards

- Staff understand the notes are memory, not the chart and not an order
- Nobody types a patient name, record number, lot, or serial
- The official card still wins when a note disagrees with it
- A phone that leaves the unit has its book exported or deleted by the person who owns it

Company names and product links open the manufacturer’s own page. Those pages are not stored here.

## Running the pilot

- **Scope.** One service line at one place, with a named sponsor, card owner, publisher, and backup publisher (`docs/governance.md`).
- **Length.** 90 days, so at least one round of confirmations goes stale and the unit sees how re-confirming works.
- **Before day one.** The unit policy is written, the phones are set up (`docs/mdm.md`), staff and the publisher are trained (`docs/training.md`), the contacts in `docs/incident-response.md` are filled in, and the privacy and security reviews have their answers (`docs/privacy.md`, `docs/security.md`, `docs/counsel-questions.md`).

## Measures

The app sends nothing anywhere, so it cannot report on itself. Every measure below comes from a short survey, from the hospital's own systems, or from what a person reads off their phone at a monthly huddle. No measure scores an individual tech.

**The reason for the app: getting new and travel staff up to speed**

| Measure | How to collect it | Baseline |
| --- | --- | --- |
| Cases until a new or travel tech sets up a surgeon's case without asking | Short survey of the tech and their preceptor at weeks 1, 2, and 4 | The same survey for staff who started in the six months before the pilot |
| How confident a new or travel tech feels setting up for a surgeon the first time | Five-point survey after each of their first ten cases with a new surgeon | Same survey in the first two weeks, or from a comparison group |
| Calls out of the room for a missing instrument, tray, or suture | The unit's existing count, if it keeps one, or a tally on the case board for two weeks at the start and two at the end | The first two weeks |
| Delays to first case start attributed to setup or missing items | The hospital's OR delay codes | The same months a year earlier |

**Whether the notes stay trustworthy**

| Measure | How to collect it | Target |
| --- | --- | --- |
| Share of unit cards confirmed within the stale time | The publisher counts cards showing **Unconfirmed** or stale on their phone at each monthly huddle | Most cards used that month are confirmed |
| Suggestions sent, and how long the card owner takes to decide | The card owner's own log of suggestions received and closed | Every suggestion is decided within 30 days |
| Unit book revisions published | Places shows the revision; the publisher notes the date | At least one every 90 days |
| Flags that point at a wrong unit card | Staff bring their flags to the huddle | Each one is fixed in the next revision |

**Safety**

| Measure | How to collect it | Target |
| --- | --- | --- |
| Patient details found in a card, flag, or file | Incident records (`docs/incident-response.md`, playbook 1) | None |
| Safety reports where a note was a factor | The hospital's safety reporting system | None; each one is reviewed |
| Unit book files refused, and why | Staff report them (playbook 5) | Each one is explained |

## Deciding at the end

The sponsor, card owner, and publisher review the measures with the privacy and security contacts. Continue, change, or stop. If the pilot stops, staff export or delete their books, and the publisher keeps one locked backup for the unit's records for as long as its policy requires.
