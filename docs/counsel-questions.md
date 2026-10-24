# Questions for counsel

Questions to put to the operator's counsel and to a hospital's legal, privacy, and compliance teams before real cards are used. Each says why it matters and what the app does today. None of this is legal advice.

## Patient privacy

1. **Is a business associate agreement needed?** The app has no patient field, stores nothing on a server, and checks free text for identifiers before it is saved or shared (`docs/data-flow.md`). Does the hospital agree the operator and host do not create, receive, maintain, or transmit PHI, and so are not business associates? If the hospital wants a BAA anyway, what would it cover?
2. **Can a board line become PHI?** The board holds a time, a room, a surgeon, and a procedure, with no patient. At a small facility or for a rare procedure, could that combination identify a patient to someone who sees the phone? Should the unit's policy limit the board to today and tomorrow (as the app does) or leave the board out?
3. **What happens when a tech types a patient detail anyway?** The check can miss things. Who must be told, and does a detail that never left the phone count differently from one that was shared or published? `docs/incident-response.md` has a draft procedure for review.
4. **Dictation.** The browser may send audio to Apple or Google. In an operating room, the microphone can pick up other people, including talk about the patient. Should the default unit rule turn dictation off? Do state recording-consent laws apply to speech recognition that is not saved as a recording?

## Device regulation

5. **Is any part of the app a device software function?** The app holds staff notes about setup and supplies. It does not analyze patient data, recommend treatment, or act on a specific patient. Please confirm against FDA's guidance on *Policy for Device Software Functions and Mobile Medical Applications* and *Clinical Decision Support Software*, and say whether the pull checklist, "Matched a case", or unit books change the answer.

## Hospital records and information

6. **Who owns the notes?** A staff member's book, a travel tech's book after the assignment ends, a hand-off file, and a published unit book. Does a hospital's confidentiality policy, or a travel agency contract, limit what a tech may keep or carry to the next facility?
7. **Preference cards.** The app stores a pointer to the official card (its label) and the tech's own notes. Does copying a card's contents into notes conflict with hospital policy or rights in the card?
8. **Is a unit book a hospital record?** If a unit publishes one, is it subject to retention, legal hold, or discovery? Who keeps past revisions? Today only the publisher's phone holds the revision history, in its backups.
9. **Personal phones.** Is the app allowed on personal phones, or only on managed ones (`docs/mdm.md`)? What does the hospital's mobile device policy require (passcode, encryption, remote wipe)?

## Liability

10. **A wrong note.** If a note is wrong and a case is delayed or a patient is harmed, how should responsibility be described among the tech, the publisher, the hospital, and the operator? Are the disclaimers in the app and `docs/terms.md` enough, and where should they be shown?
11. **Hospital agreements.** For a hospital customer, what should the agreement say about warranty, indemnity, limits of liability, insurance (cyber and professional), and the security questionnaire (`docs/security.md`)?
12. **Accepting the terms.** The app shows a notice on first use that must be acknowledged. Is that enough to make the terms binding, or should acceptance be recorded differently?

## Workforce information

13. **Staff names.** Cards can name people in the room with their role and glove size, and confirmations and activity carry typed names. Do employee privacy rules, state privacy laws, or labor agreements limit this? The app does not score or rank individual techs.
14. **Union and monitoring rules.** Could recent activity (who confirmed or flagged a card, and when) be seen as monitoring? The log stays on each person's own phone. Signed changes do travel: each card carries the typed name, time, and phone key of its last 10 saved changes into backups, hand-offs, unit books, and (the newest one) shared cards.
15. **What a signed change is.** A card's signed changes show which phone saved each change and that the record was not altered; the name is typed, not verified (`docs/security.md`). Please confirm the app should not call this an electronic signature, and whether a hospital that uses the cards in any regulated record would need 21 CFR Part 11 or its own identity system instead.

## Product names

16. **Trademarks and links.** The app names manufacturers and products to identify them and links to their own pages. It copies no instructions for use. Please confirm this is acceptable use, and whether any manufacturer relationship needs a disclosure.

## Accessibility

17. **Which rules apply?** HHS's 2024 Section 504 rule and DOJ's 2024 ADA Title II rule adopt WCAG 2.1 AA for web content and mobile apps, with compliance dates in 2026 and 2027 depending on the entity's size. Does either rule reach this app when a hospital adopts it for staff, and do state laws add anything? Please confirm the current dates. `docs/accessibility.md` has the current state.

## Operator

18. **Entity, privacy notice, and terms.** Fill in the bracketed parts of `docs/privacy.md` and `docs/terms.md`: operator name, contact, host log retention, governing law, and any liability cap.
19. **State privacy laws.** The operator receives only host request logs. Do any state consumer privacy or consumer health data laws still apply, given the app is for working staff and holds no health data about consumers?
