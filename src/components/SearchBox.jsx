import { startTransition, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * The box updates on every key; the list behind it updates when the phone has time.
 * Give it a new `key` to clear it from outside.
 */
export default function SearchBox({ initialValue = '', onChange }) {
  const [text, setText] = useState(initialValue);
  const change = (next) => {
    setText(next);
    startTransition(() => onChange(next));
  };

  return (
    <div className="relative">
      <Search size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={text}
        onChange={e => change(e.target.value)}
        aria-label="Search your book"
        placeholder="Search surgeons, sutures, trays, nicknames…"
        className="w-full min-h-11 pl-10 pr-11 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-medical-400/40 focus:bg-white"
      />
      {text && (
        <button type="button" onClick={() => change('')} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 cursor-pointer">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
