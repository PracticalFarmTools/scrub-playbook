const action = 'shrink-0 min-h-11 px-4 rounded-xl text-sm font-bold cursor-pointer';

/** Notices above the board, most urgent first: a held update, a failed save, an unreadable book, the last result, backups, Home Screen. */
export default function HomeBanners({
  updateReady, onUpdate, saveState, onExport, onRetrySave, unreadable, onDownloadUnreadable,
  notice, onDismissNotice, reminder, showHomeScreen, onHideHomeScreen,
}) {
  return (
    <>
      {updateReady && (
        <div className="bg-medical-50 border border-medical-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-medical-900">A new version is ready. It installs the next time you leave the app, never during a case.</p>
          <button type="button" onClick={onUpdate} className={`${action} bg-medical-700 text-white`}>Update now</button>
        </div>
      )}
      {!saveState.ok && (
        <div role="alert" className="bg-rose-50 border border-rose-300 rounded-2xl px-4 py-3 mb-4 space-y-2">
          <p className="text-sm font-bold text-rose-900">
            {saveState.reason === 'full'
              ? 'This phone is out of room for your book. Your last change is still on screen but is not saved yet.'
              : 'This browser is not letting the app save. Your last change is still on screen but is not saved yet.'}
          </p>
          <p className="text-xs text-rose-800">Export a backup now. Then free space or leave private browsing, and try again.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onExport} className={`${action} bg-rose-700 text-white`}>Export backup</button>
            <button type="button" onClick={onRetrySave} className={`${action} border border-rose-300 text-rose-800`}>Try again</button>
          </div>
        </div>
      )}
      {unreadable && (
        <div role="alert" className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 mb-4 space-y-2">
          <p className="text-sm font-bold text-amber-900">Your saved book could not be opened. A copy of it is kept on this phone.</p>
          <p className="text-xs text-amber-800">Download that copy and keep it. You can restore from your last backup with Import.</p>
          <button type="button" onClick={onDownloadUnreadable} className={`${action} bg-amber-700 text-white`}>Download the copy</button>
        </div>
      )}
      {notice && (
        <div className="bg-medical-50 border border-medical-200 rounded-2xl px-4 py-3 mb-4 flex items-start justify-between gap-3">
          <p role="status" className="text-sm text-medical-900">{notice}</p>
          <button type="button" onClick={onDismissNotice} className="shrink-0 min-h-11 px-2 text-xs font-bold text-medical-700 cursor-pointer">Dismiss</button>
        </div>
      )}
      {reminder && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-900">{reminder}</p>
          <button type="button" onClick={onExport} className={`${action} bg-amber-700 text-white`}>Back up</button>
        </div>
      )}
      {showHomeScreen && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 mb-4 space-y-2">
          <p className="text-sm font-bold text-sky-900">Add Scrub Playbook to your Home Screen</p>
          <p className="text-sm text-sky-900">Safari can clear a website’s saved data after 7 days without a visit. The Home Screen app keeps your book. Tap Share, then Add to Home Screen, and open it from there.</p>
          <button type="button" onClick={onHideHomeScreen} className={`${action} border border-sky-300 text-sky-900`}>
            Remind me next week
          </button>
        </div>
      )}
    </>
  );
}
