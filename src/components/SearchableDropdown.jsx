import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * Searchable dropdown with fuzzy matching.
 * Renders a text input that filters options as you type. Arrow keys move through the list,
 * Enter picks, and Escape closes the list without closing the sheet around it.
 */
export default function SearchableDropdown({
  options,          // [{ value, label, sublabel?, color? }]
  value,            // currently selected value
  onChange,         // (value) => void
  placeholder = 'Search…',
  renderSelected,   // optional: (option) => JSX for selected display
  label,            // accessible name, such as "Outer glove"
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [menuBox, setMenuBox] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();

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
      if (e.target instanceof Node && document.getElementById(listId)?.contains(e.target)) return;
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
  }, [open, listId]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, listId]);

  const closeList = () => {
    setOpen(false);
    setQuery('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleSelect = (opt) => {
    onChange(opt.value);
    closeList();
  };

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeList();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) handleSelect(filtered[active]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      {!open ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          aria-haspopup="listbox"
          aria-label={label ? `${label}: ${selectedOption?.label || 'none'}` : undefined}
          className="w-full min-h-11 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 text-sm px-4 py-2.5 text-left hover:bg-white hover:border-medical-300 focus:outline-none focus:ring-2 focus:ring-medical-400/50 transition-all cursor-pointer"
        >
          {selectedOption ? (
            renderSelected ? renderSelected(selectedOption) : (
              <span className="text-slate-800 font-medium truncate">{selectedOption.label}</span>
            )
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
          <ChevronDown size={16} className="text-slate-500 shrink-0 ml-2" />
        </button>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            aria-label={label || placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full min-h-11 pl-10 pr-11 py-2.5 rounded-xl bg-white border-2 border-medical-400 text-sm text-slate-800 placeholder-slate-500 focus:outline-none transition-all"
          />
          <button type="button" onClick={closeList} aria-label="Close the list" className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && menuBox && createPortal(
        <div
          id={listId}
          role="listbox"
          aria-label={label || placeholder}
          className="bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto"
          style={{ position: 'fixed', zIndex: 70, left: menuBox.left, width: menuBox.width, top: menuBox.top, bottom: menuBox.bottom }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">No matches</div>
          ) : (
            filtered.map((opt, index) => (
              <div
                key={opt.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
                className={`w-full min-h-11 flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-medical-50 transition-colors cursor-pointer ${
                  opt.value === value ? 'font-semibold' : ''
                } ${index === active ? 'bg-medical-50' : ''}`}
              >
                {opt.color && (
                  <span className="w-4 h-4 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: opt.color }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800 truncate">{opt.label}</p>
                  {opt.sublabel && <p className="text-xs text-slate-500 truncate">{opt.sublabel}</p>}
                </div>
                {opt.value === value && (
                  <span className="text-medical-600 text-xs font-bold shrink-0">✓</span>
                )}
              </div>
            ))
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
