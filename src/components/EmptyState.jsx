import { BookOpen, Plus } from 'lucide-react';

/**
 * Empty state shown when no surgeon cards match or the playbook is empty.
 */
export default function EmptyState({ hasQuery, searchTerm, onAddSurgeon }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <BookOpen size={28} className="text-slate-300" />
      </div>
      <h2 className="text-lg font-bold text-slate-400 mb-1">
        {hasQuery ? 'No matches found' : 'Your playbook is empty'}
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        {hasQuery ? `Nothing matched "${searchTerm}"` : 'Add your first surgeon to get started.'}
      </p>
      {!hasQuery && (
        <button
          onClick={onAddSurgeon}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-medical-600 text-white font-semibold text-sm hover:bg-medical-700 transition-all cursor-pointer"
        >
          <Plus size={16} /> Add Surgeon
        </button>
      )}
    </div>
  );
}
