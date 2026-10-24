import { useState } from 'react';
import { CHANGES_KEY, LAST_EXPORT_KEY } from '../data/schema';
import { keyPlaces, leaveKeysOut, lockPublished } from '../data/keyLock';
import { findPhiInBook, phiFoundText } from '../data/phi';
import { restoreExtras, toBackup } from '../data/backup';
import { safeGet, safeSet } from '../data/storage';
import { loadToday, localDay, saveToday } from '../data/today';
import { readHandedOver, readPublished } from '../data/unitBook';
import { dayStamp, downloadText } from '../utils/download';

const WEEK_DAYS = 7;
const CHANGES_BEFORE_REMINDER = 20;

export function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

/**
 * Backups of the whole book with its extras. A phone that publishes is asked first whether to lock
 * the publishing key with a passphrase or leave publishing out.
 */
export function useBackup({ book, bookApi, auditLog, addAudit, mergeLog, suggestions, updateSuggestions, updatePublished, setNotice, onBoardRestored }) {
  const [lastExportAt, setLastExportAt] = useState(() => safeGet(LAST_EXPORT_KEY));
  const [askKey, setAskKey] = useState(false);

  const hasOwnCards = book.surgeons.some(surgeon => !surgeon.demo);
  const changesSinceExport = Number(safeGet(CHANGES_KEY, '0')) || 0;
  const reminder = !hasOwnCards || (lastExportAt && daysSince(lastExportAt) <= WEEK_DAYS && changesSinceExport < CHANGES_BEFORE_REMINDER)
    ? ''
    : !lastExportAt
      ? 'Your book lives only on this phone. Export a backup and keep the file somewhere safe.'
      : changesSinceExport >= CHANGES_BEFORE_REMINDER
        ? `${changesSinceExport} changes since your last backup. Export a fresh one.`
        : `Your last backup is ${Math.floor(daysSince(lastExportAt))} days old. Export a fresh one.`;

  const markExported = (at) => {
    safeSet(LAST_EXPORT_KEY, at);
    safeSet(CHANGES_KEY, '0');
    setLastExportAt(at);
  };

  const save = (publishedInBackup) => {
    const data = toBackup(
      book,
      { today: loadToday(), log: auditLog, published: publishedInBackup, suggestions },
      { appVersion: __APP_VERSION__ },
    );
    downloadText(`scrubplaybook-backup-${dayStamp()}.json`, JSON.stringify(data, null, 2));
    markExported(new Date().toISOString());
    const found = findPhiInBook(book);
    if (found.length) setNotice(`Backup saved. Keep the file on your own phone. ${phiFoundText(found)}`);
  };

  const exportBackup = () => {
    if (!hasOwnCards) {
      setNotice('Samples stay on this device. Add your own surgeon before you export a backup.');
      return;
    }
    const published = readPublished();
    if (keyPlaces(published).length) {
      setAskKey(true);
      return;
    }
    save(published);
  };

  const keyPrompt = askKey ? {
    places: keyPlaces(readPublished()),
    onClose: () => setAskKey(false),
    onWithout: () => {
      const published = readPublished();
      save(leaveKeysOut(published));
      setAskKey(false);
      addAudit({ action: 'Backup saved without publishing key', surgeonName: keyPlaces(published).join(', ') });
    },
    onLock: async (passphrase) => {
      const published = readPublished();
      save(await lockPublished(published, passphrase));
      setAskKey(false);
      addAudit({ action: 'Backup saved with locked publishing key', surgeonName: keyPlaces(published).join(', ') });
    },
  } : null;

  /** Restores one of this person's own backups. `backup.extras.published` is already unlocked or left out. */
  const restore = (backup) => {
    const result = bookApi.restoreOwnBackup(backup.full);
    const before = readPublished();
    const merged = restoreExtras(
      { published: before, today: loadToday(), log: auditLog, suggestions },
      backup.extras || {},
      { today: localDay(), handedOver: readHandedOver() },
    );
    const keptPublishing = updatePublished(() => merged.published);
    if (!keptPublishing) updatePublished(current => current);
    saveToday(merged.today);
    updateSuggestions(() => merged.suggestions);
    mergeLog(backup.extras?.log || []);
    onBoardRestored();
    if (backup.exportedAt && (!lastExportAt || backup.exportedAt > lastExportAt)) markExported(backup.exportedAt);
    addAudit({ action: 'Backup restored', surgeonName: `${result.added} added`, note: `${result.updated} updated, ${result.kept} kept` });
    const publishing = keyPlaces(merged.published).filter(place => !before[place]?.privateKey);
    const again = !publishing.length
      ? ''
      : keptPublishing
        ? ` This phone publishes ${publishing.join(', ')} again. Only one phone should publish each place: if another phone still publishes ${publishing.length === 1 ? 'it' : 'them'}, hand over from that phone instead.`
        : ` Publishing for ${publishing.join(', ')} did not come back: this phone could not save it. Free some space, or leave private browsing, and restore again.`;
    setNotice(`Backup restored: ${result.added} added, ${result.updated} updated from the backup, ${result.kept} already current. Confirmations, the board, and activity came back with it.${again}`);
    return { success: true, imported: result.added, skipped: result.kept };
  };

  return { reminder, exportBackup, keyPrompt, restore, lastExportAt };
}
