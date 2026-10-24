# Governance

How a unit runs Scrub Playbook so the notes stay useful and never compete with the official card.

## Roles

| Role | Who | Responsible for |
| --- | --- | --- |
| Sponsor | OR manager or director | Approving the pilot, the unit policy, and who publishes |
| Card owner | Whoever owns the official preference cards (often a coordinator or educator) | The official card. Receives suggestions and decides on them. |
| Publisher | One named person per place, with a named backup | The unit book for that place: what is in it, when a revision goes out, and the signing key |
| Staff | Techs, nurses, and travelers | Their own notes, confirming after a case, flagging what does not match, and sending suggestions |
| Privacy and security contacts | The hospital's privacy officer and information security | Incidents (`docs/incident-response.md`) and the security review (`docs/security.md`) |

## Unit policy, in one page

A unit should write down, before real cards:

1. The official card wins. A note never overrides the surgeon or the card.
2. No patient information, implant lots or serials, doses, prices, or contract terms.
3. Which phones may hold the app: managed only, or personal phones too (`docs/mdm.md`).
4. Who publishes each place, and who takes over when that person is away or leaves.
5. The unit rules below.
6. What a departing tech does with their book.
7. Who to tell when something goes wrong.

## Unit rules

The publisher sets these in Places, under Unit rules. They go out with the next revision and apply on every phone that has the unit book.

- **A confirmation goes stale after** 30, 60, 90, or 180 days. Default 90. Use a shorter time for a service line whose cards change often.
- **Two different people confirm a card before it shows as matched.** Off by default. Turn it on when a unit wants a second set of eyes before a card is trusted.
- **Allow dictation in the editor.** On by default. Turn it off if the unit does not want audio leaving phones in the room.

## How a correction travels

1. A tech finds a card that does not match the case. They flag it on their phone with a reason. The flag shows on that phone, in the case view and on the card, until someone clears it.
2. If the official card is wrong or out of date, the tech sends **Suggest a card change** to the card owner: what the card says, what they saw, and the change. The app remembers the suggestion on that card and reminds the tech to check for it.
3. The card owner decides and updates the official card.
4. The publisher updates the unit's card and publishes a new revision.
5. Staff import the revision. Their phones show what changed, keep their match on every card that did not change, and tell the tech when a revision came out after their suggestion.

Flags stay on the phone that made them. Nothing reaches the publisher or the card owner unless someone sends it. A unit that wants flags reviewed should ask staff to send a suggestion as well, or bring flags to a regular huddle.

## Revisions

- Publish when cards change, and at least every 90 days. A staff phone warns when the revision it is offered is more than 90 days old.
- Every revision is signed. Staff phones refuse a file that was changed, signed by another key, or older than the one they have.
- The publisher's backups are the revision history. Keep one locked backup after each revision.

## The signing key

The key lives on the publisher's phone and signs every revision.

- **Announce it.** After the first publish, Places shows the publisher key, for example `7CD8-D1D1-8D33-A846`. Post it where staff can see it, such as the unit's huddle board. A staff phone trusts the key on the first file it accepts for a unit book, so staff compare the key on that first import.
- **Back it up locked.** When the publisher exports a backup, the app asks for a passphrase and locks the key with it. Keep the passphrase in the hospital's password manager, not with the backup.
- **Hand over, do not share.** When the publisher changes, use Hand over publishing in Places. The file holds the key, so send it to the next publisher only, by a channel the unit trusts, and have them delete it after taking over. The old phone stops publishing.
- **Old backups.** A backup made before a hand-over still holds the key, locked with the old passphrase. The phone that handed over will not restore publishing from it, but another phone could. Delete those backups once the hand-over is done.
- **If the key leaks or is lost**, the publisher uses **Replace the publishing key** in Unit rules and publishes again. Staff switch to the new unit book after checking the new key, and their phones then refuse the old one. The full steps are playbook 3 in `docs/incident-response.md`. After a replacement, delete the backups made before it.

## Departing staff

- A tech leaving a place: Places, Hand off to the next tech, then Archive or Delete that place.
- A traveler at the end of an assignment: the same, following the agency contract and the hospital's policy on keeping notes.
- A publisher leaving: Hand over publishing first, then follow the steps above.
- A phone being replaced: export a backup (locked, if the phone publishes), restore it on the new phone, then delete the book from the old one.

## Review

- **Monthly** during the pilot: the sponsor, card owner, and publishers review the measures in `docs/pilot.md`, open suggestions, and any incidents.
- **Every revision**: the publisher reads the change list before sending it.
- **Every year**: review the unit policy, the security answers, and the accessibility notes.
