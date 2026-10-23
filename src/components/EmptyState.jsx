import { BookOpen, Plus } from 'lucide-react';

/**
 * Empty state shown when no surgeon cards match, every place is archived, or the playbook is empty.
 */
export default function EmptyState({ hasQuery, searchTerm, archivedCount = 0, onAddSurgeon, onPreview, onOpenPlaces }) {
  const archivedOnly = !hasQuery && archivedCount > 0;
  const title = hasQuery
    ? 'No matches found'
    : archivedOnly ? 'Every place is archived' : 'Your playbook is empty';
  const body = hasQuery
    ? `Nothing matched "${searchTerm}"`
    : archivedOnly
      ? `${archivedCount} archived ${archivedCount === 1 ? 'surgeon is' : 'surgeons are'} kept in Places. Restore a place to see it here.`
      : 'Add your first surgeon to get started.';
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <BookOpen size={28} className="text-slate-300" />
      </div>
      <h2 className="text-lg font-bold text-slate-400 mb-1">{title}</h2>
      <p className="text-sm text-slate-400 mb-6">{body}</p>
      {!hasQuery && onAddSurgeon && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onAddSurgeon}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-medical-600 text-white font-semibold text-sm hover:bg-medical-700 transition-all cursor-pointer"
          >
            <Plus size={16} /> Add Surgeon
          </button>
          {archivedOnly && onOpenPlaces && (
            <button
              onClick={onOpenPlaces}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              Open Places
            </button>
          )}
          {!archivedOnly && onPreview && (
            <button
              onClick={onPreview}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              Preview sample cards
            </button>
          )}
        </div>
      )}
    </div>
  );
}
