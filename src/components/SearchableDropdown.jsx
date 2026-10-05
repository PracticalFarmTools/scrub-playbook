import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * Searchable dropdown with fuzzy matching.
 * Renders a text input that filters options as you type.
 */
export default function SearchableDropdown({
  options,          // [{ value, label, sublabel?, color? }]
  value,            // currently selected value
  onChange,         // (value) => void
  placeholder = 'Search…',
  renderSelected,   // optional: (option) => JSX for selected display
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuBox, setMenuBox] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const placeMenu = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 220 && rect.top > spaceBelow;
    setMenuBox({
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
    });
  };

  const selectedOption = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel || '').toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => placeMenu());
    const close = (e) => {
      if (containerRef.current?.contains(e.target)) return;
      if (e.target instanceof Node && document.getElementById('scrub-dropdown-menu')?.contains(e.target)) return;
      setOpen(false);
      setQuery('');
    };
    const move = () => placeMenu();
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', move);
    window.addEventListener('scroll', move, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', move);
      window.removeEventListener('scroll', move, true);
    };
  }, [open]);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 text-sm px-4 py-2.5 text-left hover:bg-white hover:border-medical-300 focus:outline-none focus:ring-2 focus:ring-medical-400/50 transition-all cursor-pointer"
        >
          {selectedOption ? (
            renderSelected ? renderSelected(selectedOption) : (
              <span className="text-slate-800 font-medium truncate">{selectedOption.label}</span>
            )
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
          <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />
        </button>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border-2 border-medical-400 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
          <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && menuBox && createPortal(
        <div
          id="scrub-dropdown-menu"
          className="bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto"
          style={{ position: 'fixed', zIndex: 70, left: menuBox.left, width: menuBox.width, top: menuBox.top, bottom: menuBox.bottom }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">No matches</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-medical-50 transition-colors cursor-pointer ${
                  opt.value === value ? 'bg-medical-50 font-semibold' : ''
                }`}
              >
                {opt.color && (
                  <span className="w-4 h-4 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: opt.color }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800 truncate">{opt.label}</p>
                  {opt.sublabel && <p className="text-[11px] text-slate-400 truncate">{opt.sublabel}</p>}
                </div>
                {opt.value === value && (
                  <span className="text-medical-600 text-xs font-bold shrink-0">✓</span>
                )}
              </button>
            ))
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
