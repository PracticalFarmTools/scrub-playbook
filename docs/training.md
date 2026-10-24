# Training

Three short sessions: staff, publishers, and card owners. Each ends with a check the trainer watches, not a quiz. Practice on a spare or freshly opened phone with **Preview sample cards** from the empty book, so nobody practices on real notes. Sample cards are labeled as samples and are left out of backups and sharing, so add one practice surgeon of your own for the sharing and backup steps.

## Staff: 20 minutes

Who: every tech, nurse, and traveler who will use the app. Travelers take it on their first day, before their first case at that place.

**Rules first (3 minutes)**

- The official preference card and the surgeon win. A note is memory, not an order.
- Never type a patient name, record number, date of birth, implant lot, or serial. The app pauses when it sees one, but the pause is a check, not a promise.
- A card shows **Unconfirmed** until someone who was in the case confirms it. A confirmation goes stale after the unit's set number of days.

**Hands on (12 minutes)**

1. Type your name when the app asks. It labels your confirmations and activity on this phone, and it is signed into every card change you save.
2. Today: tap **Paste the board**, paste three lines from the board (time, room, surgeon, procedure; no patient names), tap **Read the lines**, then **Add 3 lines to today**. Open a matched card from the list.
3. In the case view, find the trays and sutures, switch **Dark** on and off, and use **Previous** and **Next**.
4. After the case: tap **I was in this case** to confirm, or **Flag** with what did not match.
5. If the official card is wrong, tap **Suggest a card change**, write what the card says, what you saw, and the change, and send it. Tap **I sent it** once it has gone.
6. Edit a card, change one tray, check that **Your name** is yours, and tap **Save procedure**. Try leaving without saving and see the app ask first.
   See the card say **Last change signed by** your name. Then tap **History** on that card: your change is under **Signed changes**. View the version before your change and bring it back. See that the card is unconfirmed again.
7. Share a procedure with the person next to you, and import theirs with **Import**. See that it arrives unconfirmed.
8. Tap **Export backup** and save the file where your phone keeps files.

**Leaving a place (2 minutes)**

- Places, **Hand off** to whoever comes next, then **Archive** or **Delete** that place. Deleting a place keeps nothing of its cards on the phone. Follow your contract and the hospital's policy on keeping notes.

**Check (3 minutes).** The trainee pastes a board line, opens the card, confirms it, flags a second card with a reason, and exports a backup without help.

## Publishers: 30 minutes

Who: the named publisher and the named backup for each place.

1. Places, open **Unit rules**, and set the stale time, two-person confirmation, and dictation for the unit (`docs/governance.md`).
2. **Publish as unit book.** Read the publisher key the app shows and post it where staff can see it. Staff compare it on their first import.
3. Send the file through the unit's usual channel. On a staff phone, import it and read the change list.
4. Change one card, publish revision 2, import it on the staff phone, and see that only that card lost its match.
5. **Export backup.** Choose a passphrase of at least 8 characters, store it in the hospital's password manager, and lock the key. Restore the backup on a spare phone with the passphrase, then once without it, and see that only the first can publish.
6. **Hand over publishing** to the backup publisher on the spare phone, and see the old phone stop publishing.
7. Walk through playbook 3 in `docs/incident-response.md` on the spare phone: **Replace the publishing key**, publish, and switch a staff phone over after comparing the key.

**Check.** The publisher publishes a revision, locks a backup, and explains, in their own words, when to replace the key.

## Card owners: 10 minutes

Who: whoever owns the official preference cards.

1. What a suggestion looks like: the card, what it says, what the tech saw, and the suggested change. It arrives by whatever channel the tech used.
2. Decide on it in the official system. The app never changes the official card.
3. Tell the publisher, who updates the unit book and publishes a revision. The tech's phone tells them when a revision came out after their suggestion.

## Records

Keep a list of who was trained, by whom, and when. The pilot measures in `docs/pilot.md` ask for it.
