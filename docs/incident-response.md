# Incident response

What to do when something goes wrong. Each playbook says who acts, what to do first, and how to close it out. The unit's privacy officer and information security team own the hospital's own incident process; these steps feed into it and do not replace it.

Keep a short record of each incident: date, who reported it, what happened, what was done, and who was told.

## 1. A patient detail was typed into a card

**Signs.** Someone notices a patient name, record number, date of birth, or similar in a card, flag, suggestion, or the board. The app's pause may have been dismissed by editing around it, or the pattern was not caught.

**First, on the phone that has it.**

1. Edit the card and remove the detail, or delete the card. The app keeps no older version of a card.
2. Check recent activity on that phone for the card. Activity notes hold card names and flag reasons, so remove the detail from the card name if it was there.
3. If the phone has backups that contain the detail, delete those files and export a fresh backup.

**Then find out whether it left the phone.**

4. Was the card shared, handed off, published, or sent as a suggestion after the detail was added? Recent activity shows hand-offs and publishes. Shares and suggestions go through the phone's share sheet, so ask the person.
5. If it was published in a unit book: the publisher fixes the card and publishes a new revision right away, and asks staff to import it. Older revision files still contain the detail; ask staff to delete them.
6. If it was shared, handed off, or suggested: ask each recipient to delete the message or file and the card on their phone.

**Report.** Tell the privacy officer, with where the detail was and who could have seen it. The privacy officer decides whether it is a reportable event.

**Close.** Note which pattern the check missed, if any, and send it to the operator so the check can be improved.

## 2. A phone was lost or stolen

1. The owner tells their manager and, for a managed phone, IT, who can lock or wipe it.
2. The book is protected by the phone's passcode and encryption. There is no account to disable.
3. The owner restores their latest backup on a new phone. A publisher restores the locked key with the backup passphrase.
4. If the phone published a unit book, treat the signing key as possibly exposed and follow playbook 3, unless the phone was locked with a strong passcode and was wiped quickly.

## 3. A signing key leaked or a hand-over file went to the wrong person

**Signs.** A hand-over file was sent to a group or the wrong person, a publisher's unlocked backup was shared, a backup passphrase was exposed together with the backup, or a publisher's phone was lost unlocked.

Anyone with the key can sign revisions, with any revision number, that staff phones accept for that unit book. Publishing another revision does not stop that. Staff phones keep trusting the key until they switch to a new unit book.

1. Tell staff, in person or through the unit's usual channel, not to import any unit book file for that place until the publisher announces the new one, and to report any file they did not expect.
2. The publisher opens Places, opens Unit rules for the place, taps **Replace the publishing key**, and confirms with **Replace the key**. The unit rules stay. If the publisher's phone is gone, the publisher restores their latest backup on a new phone (with or without the passphrase) and does the same, or simply publishes the place: a phone without the key starts a new unit book.
3. The publisher taps **Publish as unit book**. The app shows the new publisher key, for example `7CD8-D1D1-8D33-A846`. The publisher announces that key to staff through a channel the unit trusts, separate from the file itself.
4. Each staff member imports the new file. The import sheet says the surgeons come from an earlier unit book and shows the key. They compare it with the announced key and tap **Switch to this unit book**. From then on, that phone refuses every file from the old unit book, including ones signed with the leaked key.
5. The publisher saves a new locked backup and deletes older backups. A phone that replaced its key will not restore the old key from an older backup, but another phone could.
6. Ask anyone who received the leaked file or backup to delete it.
7. Check with each staff member that they switched. A phone that has not imported the new file still trusts the old key.
8. Tell information security.

## 4. A wrong card contributed to a delay or a near miss

1. Report it through the hospital's safety reporting system as for any other event. The official card and the surgeon remain the reference.
2. Flag the card with what was wrong, and send a suggestion to the card owner if the official card is involved.
3. If the card came from a unit book, the publisher fixes it and publishes a new revision.
4. Keep the phone's book as it is until the safety review has what it needs. Export a backup so the state of the card is kept.

## 5. A unit book file is refused

**Signs.** A staff phone says a file was changed after it was published, was signed by a different publisher, or is older than the one it has.

1. Do not work around it. The check is doing its job.
2. Ask the publisher whether they sent that file. Get the file directly from the publisher.
3. If the publisher did not send it, treat it as playbook 3.

## 6. A bad app update or the site is down

1. Phones that already have the app keep working offline. The app does not update while a case view or editor is open.
2. If an update breaks something, the operator rolls the host back to the previous deployment. Phones pick up the rollback the next time they check for an update.
3. If a phone shows the recovery screen, the person exports the unreadable copy it offers before doing anything else, and sends it to the operator. Nothing is lost by exporting.

## 7. Dictation picked up a patient detail

1. Delete the text from the field before saving.
2. The audio may already have been processed by the browser's speech service. Tell the privacy officer, as in playbook 1.
3. Consider turning dictation off in the unit rules.

## Contacts

| Who | Name | How to reach |
| --- | --- | --- |
| Unit sponsor | [name] | [phone or pager] |
| Privacy officer | [name] | [contact] |
| Information security | [team] | [contact] |
| Publisher for each place | [names] | [contact] |
| Operator | [operator name] | [contact email] |
