import { useState } from 'react';
import { COMPANIES, getCompany } from '../data/companies';
import { uid } from '../data/schema';
import { SYSTEMS, SYSTEMS_MAX, doorsFor, findSystemByName, getSystem, sameSystemName, systemIdentity } from '../data/systems';
import SearchableDropdown from './SearchableDropdown';

const CATALOG_OPTIONS = [
  { value: '', label: 'Choose a system', sublabel: '' },
  ...SYSTEMS.map(system => ({
    value: system.id,
    label: system.name,
    sublabel: getCompany(system.companyId)?.name || '',
  })),
];

const COMPANY_OPTIONS = [
  { value: '', label: 'Company, if you know it', sublabel: '' },
  ...COMPANIES.map(company => ({
    value: company.id,
    label: company.name,
    sublabel: company.blurb,
  })),
];

function isHttps(url) {
  return /^https:\/\//i.test(String(url || '').trim());
}

/**
 * The named doors for one system. A company instructions page stays its own control.
 * @param {{ use: import('../data/systems').SystemUse, dark?: boolean, room?: boolean }} props
 */
export function SystemDoors({ use, dark = false, room = false }) {
  const doors = doorsFor(use);
  const company = getCompany(use.companyId);
  const identity = systemIdentity(use);
  const linkClass = room
    ? `inline-flex items-center min-h-11 px-3 rounded-xl text-base font-bold underline underline-offset-2 ${dark ? 'bg-slate-800 text-sky-200' : 'bg-medical-50 text-medical-800'}`
    : 'inline-flex items-center min-h-11 text-sm font-bold text-medical-700 underline underline-offset-2';
  const quiet = dark ? 'text-slate-400' : 'text-slate-500';
  const any = doors.product || doors.catalog || doors.hospital || doors.instructions;
  return (
    <div className={room ? 'py-2' : 'py-1'}>
      <p className={room ? 'text-lg font-bold' : 'text-sm font-semibold text-slate-800'}>
        {identity.listed}
        {company ? <span className={`font-medium ${quiet}`}> · {company.name}</span> : null}
        {use.repExpected ? <span className={`font-medium ${quiet}`}> · Rep expected</span> : null}
      </p>
      {identity.called ? <p className={`text-sm ${quiet}`}>Room calls it {identity.called}.</p> : null}
      <div className="flex flex-wrap gap-2 mt-1">
        {doors.product && (
          <a className={linkClass} href={doors.product.href} target="_blank" rel="noopener noreferrer">Product page</a>
        )}
        {doors.catalog && (
          <a className={linkClass} href={doors.catalog.href} target="_blank" rel="noopener noreferrer">Catalog code {use.catalogNumber}</a>
        )}
        {doors.hospital && (
          <a className={linkClass} href={doors.hospital.href} target="_blank" rel="noopener noreferrer">Hospital item</a>
        )}
        {doors.instructions && (
          <a className={linkClass} href={doors.instructions.href} target="_blank" rel="noopener noreferrer">{doors.instructions.label}</a>
        )}
        {use.catalogNumber && !doors.catalog && (
          <p className={`text-sm ${quiet}`}>Catalog code {use.catalogNumber}</p>
        )}
        {!any && <p className={`text-sm ${quiet}`}>No page is stored for this system yet.</p>}
      </div>
    </div>
  );
}

/**
 * Add, name, and remove systems. Used on a card and on a surgeon.
 * @param {{ systems: Array<object>, onChange: (next: Array<object>) => void, suggestions?: Array<object> }} props
 */
export function SystemListEditor({ systems, onChange, suggestions = [] }) {
  const [catalogId, setCatalogId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [notice, setNotice] = useState('');
  const full = systems.length >= SYSTEMS_MAX;
  const input = 'w-full min-h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2';
  const taken = new Set(systems.map(item => item.catalogId).filter(Boolean));
  const pending = suggestions.filter(item => item.catalogId && !taken.has(item.catalogId) && !systems.some(row => sameSystemName(row.name, item.name)));

  const addListed = (system) => {
    onChange([...systems, {
      id: uid(), catalogId: system.id, name: system.name, companyId: system.companyId,
      catalogNumber: '', overrideUrl: '', repExpected: false,
    }]);
    setCatalogId('');
    setCustomName('');
    setCustomCompany('');
    setNotice('');
  };

  const addCatalog = () => {
    const system = getSystem(catalogId);
    if (!system || full || taken.has(system.id)) return;
    addListed(system);
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name || full) return;
    const listed = findSystemByName(name);
    if (listed) {
      if (taken.has(listed.id) || systems.some(row => sameSystemName(row.name, listed.name))) {
        setNotice(`${listed.name} is already on this list.`);
        return;
      }
      addListed(listed);
      return;
    }
    if (systems.some(row => sameSystemName(row.name, name))) {
      setNotice(`${name} is already on this list.`);
      return;
    }
    onChange([...systems, {
      id: uid(), catalogId: null, name, companyId: customCompany || null,
      catalogNumber: '', overrideUrl: '', repExpected: false,
    }]);
    setCustomName('');
    setCustomCompany('');
    setNotice('');
  };

  const patch = (id, next) => onChange(systems.map(item => item.id === id ? { ...item, ...next } : item));

  return (
    <div className="space-y-3">
      {systems.map((item, index) => {
        const badLink = item.overrideUrl?.trim() && !isHttps(item.overrideUrl);
        return (
          <div key={item.id} className="space-y-2 border border-slate-100 rounded-xl p-3">
            <input
              aria-label={`System ${index + 1} name`}
              value={item.name}
              maxLength={80}
              onChange={e => patch(item.id, { name: e.target.value })}
              className={input}
            />
            {getSystem(item.catalogId) && (
              <p className="text-xs text-slate-600">Listed as {getSystem(item.catalogId).name}. The product page stays with that system.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label={`System ${index + 1} catalog code`}
                value={item.catalogNumber || ''}
                maxLength={40}
                placeholder="Catalog code"
                onChange={e => patch(item.id, { catalogNumber: e.target.value })}
                className={input}
              />
              <input
                aria-label={`System ${index + 1} hospital item link`}
                value={item.overrideUrl || ''}
                maxLength={300}
                placeholder="Hospital item, https://"
                onChange={e => patch(item.id, { overrideUrl: e.target.value })}
                className={input}
              />
            </div>
            {badLink && <p role="alert" className="text-xs font-semibold text-rose-700">A hospital item link has to start with https://.</p>}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 min-h-11 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="w-5 h-5 shrink-0"
                  checked={Boolean(item.repExpected)}
                  onChange={e => patch(item.id, { repExpected: e.target.checked })}
                />
                Rep expected
              </label>
              <button type="button" onClick={() => onChange(systems.filter(row => row.id !== item.id))} aria-label={`Remove system ${index + 1}`} className="min-h-11 px-2 text-xs font-bold text-rose-600 cursor-pointer">Remove</button>
            </div>
          </div>
        );
      })}

      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map(item => (
            <button
              key={item.id || item.catalogId}
              type="button"
              disabled={full}
              onClick={() => onChange([...systems, { ...item, id: uid(), catalogNumber: item.catalogNumber || '', overrideUrl: item.overrideUrl || '', repExpected: Boolean(item.repExpected) }])}
              className="min-h-11 px-3 rounded-xl bg-medical-50 text-xs font-bold text-medical-800 disabled:opacity-40 cursor-pointer"
            >
              Use {item.name}
            </button>
          ))}
        </div>
      )}

      <SearchableDropdown label="Add a listed system" options={CATALOG_OPTIONS.filter(option => !option.value || !taken.has(option.value))} value={taken.has(catalogId) ? '' : catalogId} onChange={setCatalogId} placeholder="Search systems" renderSelected={opt => <span>{opt?.label}</span>} />
      <button type="button" disabled={full || !catalogId || taken.has(catalogId)} onClick={addCatalog} className="min-h-11 text-xs font-bold text-medical-700 disabled:opacity-40 cursor-pointer">Add system</button>

      <div className="grid grid-cols-1 gap-2">
        <input aria-label="System name not in the list" value={customName} maxLength={80} placeholder="A system this list does not have" onChange={e => setCustomName(e.target.value)} className={input} />
        <SearchableDropdown label="Company for a system not in the list" options={COMPANY_OPTIONS} value={customCompany} onChange={setCustomCompany} placeholder="Company" renderSelected={opt => <span>{opt?.label}</span>} />
        <button type="button" disabled={full || !customName.trim()} onClick={addCustom} className="min-h-11 text-xs font-bold text-medical-700 disabled:opacity-40 cursor-pointer text-left">Add this name</button>
        {notice && <p role="status" className="text-xs font-semibold text-slate-600">{notice}</p>}
      </div>
      {full && <p className="text-xs text-slate-500">This list keeps {SYSTEMS_MAX} systems. Remove one to add another.</p>}
    </div>
  );
}

/**
 * Systems a surgeon uses, above their cards.
 * @param {{ surgeon: any, editable: boolean, onSave?: (id: string, systems: Array<object>) => void }} props
 */
export function PreferredSystems({ surgeon, editable, onSave }) {
  const saved = surgeon.preferredSystems || [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [blocked, setBlocked] = useState(false);
  if (!editable && saved.length === 0) return null;

  const start = () => {
    setDraft(saved.map(item => ({ ...item })));
    setBlocked(false);
    setEditing(true);
  };
  const save = () => {
    const bad = draft.some(item => item.overrideUrl?.trim() && !isHttps(item.overrideUrl));
    if (bad) {
      setBlocked(true);
      return;
    }
    if (onSave?.(surgeon.id, draft) === false) return;
    setEditing(false);
  };

  return (
    <div className="px-5 pt-3">
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Systems {surgeon.name} uses</p>
          {editable && !editing && (
            <button type="button" onClick={start} aria-label={`Edit systems for ${surgeon.name}`} className="min-h-11 min-w-11 px-2 -mr-2 text-xs font-bold text-medical-700 cursor-pointer">Edit</button>
          )}
        </div>
        {editing ? (
          <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <SystemListEditor systems={draft} onChange={setDraft} />
            {blocked && <p role="alert" className="text-xs font-semibold text-rose-700">A hospital item link has to start with https://.</p>}
            <div className="flex gap-1 text-xs font-bold">
              <button type="submit" className="min-h-11 px-2 text-medical-700 cursor-pointer">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-2 text-slate-600 cursor-pointer">Cancel</button>
            </div>
          </form>
        ) : saved.length === 0 ? (
          <button type="button" onClick={start} className="min-h-11 text-xs font-bold text-medical-700 cursor-pointer">Add the systems this surgeon uses</button>
        ) : (
          <div className="mt-1">
            {saved.map(item => <SystemDoors key={item.id || item.catalogId || item.name} use={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
