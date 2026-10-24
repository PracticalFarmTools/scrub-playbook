import { useCallback } from 'react';
import { PUBLISHED_KEY } from '../data/schema';
import { findPhiInBook, phiFoundText } from '../data/phi';
import { inPlaceGroup } from '../data/places';
import { toPlacePack } from '../data/backup';
import {
  handOverPublishing, publishUnitBook, readPublished, recordHandedOver, replacePublishingKey, savePublished, withUnitSettings,
} from '../data/unitBook';
import { dayStamp, shareFile, slugify } from '../utils/download';
import { PUBLISHING_LOCK, withLock } from '../utils/locks';
import { readTechName } from './useBook';
import { useStoredState } from './useStoredState';

function placePhi(book, place, archived) {
  return findPhiInBook(book, book.surgeons.filter(surgeon => inPlaceGroup(surgeon, place, archived)).map(surgeon => surgeon.id));
}

function withEntry(published, place, entry) {
  const next = { ...published };
  if (entry) next[place] = entry;
  else delete next[place];
  return next;
}

/** Puts back the entry from before a publish, keeping unit rules another tab saved meanwhile. */
function rollBack(published, place, before, written) {
  const settings = published[place]?.settings;
  if (!settings || JSON.stringify(settings) === JSON.stringify(written.settings)) return withEntry(published, place, before);
  return withEntry(published, place, { ...(before || {}), settings });
}

export const CANNOT_SAVE = 'This phone could not save its publishing record. Free some space, or leave private browsing, and try again.';

/**
 * Hand-offs and unit book publishing for each place. Every change starts from what is stored now, and
 * signing runs under one lock, so two open tabs never publish the same place under two keys.
 */
export function usePublishing({ book, addAudit, setNotice }) {
  const [published, update] = useStoredState(PUBLISHED_KEY, readPublished, savePublished);
  const author = () => readTechName() || 'A tech';

  const handOffPlace = async (place, { archived = false } = {}) => {
    const found = placePhi(book, place, archived);
    if (found.length) return { message: `${place} was not handed off. ${phiFoundText(found)}` };
    const pack = toPlacePack(book, place, author(), new Date().toISOString(), { archived });
    const outcome = await shareFile(`scrubplaybook-${slugify(place)}-${dayStamp()}.json`, pack);
    if (outcome === 'cancelled') return { message: `${place} was not handed off.` };
    addAudit({ action: 'Place handed off', surgeonName: place, note: `${pack.book.surgeons.length} surgeons, ${pack.book.procedures.length} procedures` });
    return { message: `Hand-off file for ${place} is ready. The cards arrive unconfirmed for the next tech.` };
  };

  const publishPlace = (place) => withLock(PUBLISHING_LOCK, async () => {
    const found = placePhi(book, place, false);
    if (found.length) return { message: `${place} was not published. ${phiFoundText(found)}` };
    let signed;
    try {
      signed = await publishUnitBook(book, place, author(), { published: readPublished() });
    } catch (err) {
      if (err?.message === 'no-key') return { message: `This phone does not hold the publishing key for ${place}. Restore your locked backup with its passphrase, ask the unit who publishes ${place} now, or replace the publishing key in Unit rules.` };
      throw err;
    }
    const { file, fingerprint } = signed;
    const before = readPublished()[place];
    // The revision and key are kept before the file leaves, so a file that went out is never followed
    // by a repeated revision or a new key that staff phones would refuse.
    const written = signed.published[place];
    const kept = update(current => withEntry(current, place, { ...written, settings: current[place]?.settings || written.settings }));
    if (!kept) {
      update(current => rollBack(current, place, before, written));
      return { message: `${place} was not published. ${CANNOT_SAVE}` };
    }
    const outcome = await shareFile(`scrubplaybook-unit-${slugify(place)}-r${file.revision}.json`, file);
    if (outcome === 'cancelled') {
      update(current => rollBack(current, place, before, written));
      return { message: `${place} was not published. The next file is still revision ${file.revision}.` };
    }
    addAudit({ action: 'Unit book published', surgeonName: place, note: `Revision ${file.revision}` });
    setNotice(`Published ${place} as unit book revision ${file.revision}.`);
    return { message: `Published ${place} as unit book revision ${file.revision}. Publisher key ${fingerprint}.` };
  });

  const handOverPlace = (place) => withLock(PUBLISHING_LOCK, async () => {
    const found = placePhi(book, place, false);
    if (found.length) return { message: `Publishing for ${place} was not handed over. ${phiFoundText(found)}` };
    const result = await handOverPublishing(book, place, author(), { published: readPublished() });
    if (!result.file) return { message: `This phone does not publish ${place}.` };
    const outcome = await shareFile(`scrubplaybook-publisher-${slugify(place)}-r${result.revision}.json`, result.file);
    if (outcome === 'cancelled') return { message: `Publishing for ${place} was not handed over. This phone still publishes it.` };
    const removed = update(current => withEntry(current, place, null));
    const recorded = recordHandedOver(place, result.file.unitFile.unitBookId, result.revision);
    addAudit({ action: 'Publishing handed over', surgeonName: place, note: `Revision ${result.revision}` });
    const ready = `Hand-over file for ${place} is ready with revision ${result.revision}. Send it only to the next publisher.`;
    if (!removed || !recorded) {
      return { message: `${ready} This phone could not save that it handed over, so it may offer to publish ${place} again after a restart. Do not publish ${place} from this phone again.` };
    }
    return { message: `${ready} This phone no longer publishes ${place}; your cards stay as your notes.` };
  });

  const replaceKey = (place) => withLock(PUBLISHING_LOCK, () => {
    if (!update(current => replacePublishingKey(current, place))) {
      update(current => current);
      return { message: `The key for ${place} was not replaced. ${CANNOT_SAVE}` };
    }
    addAudit({ action: 'Publishing key replaced', surgeonName: place });
    return {
      message: `The key for ${place} is replaced. Publish ${place} now and send the file to every staff phone; each one is asked to switch to the new unit book. Tell staff the new publisher key shown after you publish. Then save a new locked backup and delete older backups, which still hold the old key.`,
    };
  });

  const saveUnitSettings = useCallback((place, settings) => {
    update(current => withUnitSettings(current, place, settings));
  }, [update]);

  return { published, update, handOffPlace, publishPlace, handOverPlace, replaceKey, saveUnitSettings };
}
