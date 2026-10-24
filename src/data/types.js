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
 * @property {UnitStamp} [unitBook]
 *
 * @typedef {object} Procedure
 * @property {string} id
 * @property {string} surgeonId
 * @property {string} name
 * @property {string} [approach]
 * @property {boolean} [demo]
 * @property {Array<object>} [confirmations]
 * @property {string | null} [lastConfirmedAt]
 * @property {string} [updatedAt]
 * @property {object} [blocks]
 * @property {UnitStamp} [unitBook]
 *
 * @typedef {object} UnitStamp Where a card came from when it arrived in a unit book.
 * @property {string} id
 * @property {string} place
 * @property {number} revision
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
 */

export {};
