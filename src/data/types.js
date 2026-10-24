/**
 * Shapes shared by the data layer. Checked by `npm run typecheck`; nothing here runs.
 *
 * @typedef {object} Surgeon
 * @property {string} id
 * @property {string} name
 * @property {string} [specialty]
 * @property {string} [facility]
 * @property {boolean} [demo]
 * @property {boolean} [archived]
 * @property {Array<object>} [firstCase]
 * @property {string | null} [firstCaseAt]
 * @property {string} [firstCaseBy]
 * @property {string} [createdAt]
 * @property {string} [addedBy]
 * @property {UnitStamp} [unitBook]
 *
 * @typedef {object} Confirmation
 * @property {string} name
 * @property {string | null} [userId]
 * @property {string} at
 *
 * @typedef {object} TextBlock
 * @property {string} text
 * @property {string} source
 * @property {string} updatedBy
 * @property {string | null} updatedAt
 *
 * @typedef {{ productId: string | null, model: string, brand: string, color: string, size: string }} Glove
 *
 * @typedef {object} Blocks
 * @property {TextBlock} position
 * @property {TextBlock} prep
 * @property {TextBlock} drapes
 * @property {TextBlock} room
 * @property {TextBlock} equipment
 * @property {Array<object>} steps
 * @property {Array<object>} instruments
 * @property {Array<object>} trays
 * @property {Array<object>} implants
 * @property {Array<object>} sutures
 * @property {{ outer: Glove | null, inner: Glove | null }} gloves
 * @property {Array<object>} nicknames
 * @property {TextBlock} endOfCase
 * @property {Array<object>} people
 * @property {TextBlock} note
 *
 * @typedef {object} Procedure
 * @property {string} id
 * @property {string} surgeonId
 * @property {string} name
 * @property {string} [approach]
 * @property {boolean} [demo]
 * @property {boolean} [disputed]
 * @property {boolean} [reported]
 * @property {string} [reportNote]
 * @property {Array<Confirmation>} [confirmations]
 * @property {string | null} [lastConfirmedAt]
 * @property {{ label: string, reviewedAt: string | null, note: string }} [official]
 * @property {string} [updatedAt]
 * @property {string} [baseUpdatedAt]
 * @property {Blocks} [blocks]
 * @property {UnitStamp} [unitBook]
 * @property {Array<import('./editTrail').SignedEdit>} [trail] Signed records of the last changes, oldest first.
 *
 * @typedef {object} UnitStamp Where a card came from when it arrived in a unit book.
 * @property {string} id
 * @property {number} revision
 * @property {string | null} [publishedAt]
 * @property {string} [key] Fingerprint of the publisher key that signed it.
 * @property {object} [settings]
 * @property {Array<string>} [replaced] Earlier unit book ids this one replaced.
 * @property {Array<object>} [changes] What this revision changed on the card.
 *
 * @typedef {object} Book
 * @property {number} version
 * @property {Array<Surgeon>} surgeons
 * @property {Array<Procedure>} procedures
 *
 * @typedef {object} PublishedEntry What this phone knows about one place's unit book.
 * @property {string} [unitBookId]
 * @property {number} [revision]
 * @property {string} [publishedAt]
 * @property {object} [settings]
 * @property {JsonWebKey} [publicKey]
 * @property {JsonWebKey} [privateKey]
 * @property {object} [lockedKey]
 * @property {string} [fingerprint]
 * @property {Array<string>} [retired] Unit book ids this place replaced with a new key.
 *
 * @typedef {Record<string, PublishedEntry>} Published
 *
 * @typedef {{ unitBookId: string, revision: number, at: string }} HandOverRecord
 *
 * @typedef {{ id: string, label: string }} PhiSignal A detail that looks like it identifies a patient.
 *
 * @typedef {{ id: string, startsAt: string, room: string, surgeonName: string, procedureName: string, day?: string }} TodayItem
 */

export {};
