import { useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { COMPANIES, SPECIALTIES, getCompany, specialtyLabel } from '../data/companies';
import { SYSTEMS } from '../data/systems';
import { useDialog } from '../hooks/useDialog';
import { SystemDoors } from './Systems';

function CompanyLink({ company }) {
  const body = (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-800 truncate">{company.name}</p>
      <p className="text-xs text-slate-500 truncate">{company.blurb}</p>
    </div>
  );
  if (!company.url) {
    return (
      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 min-h-11">
        {body}
        <span className="text-xs font-semibold text-slate-400 shrink-0 ml-2">No page stored</span>
      </div>
    );
  }
  return (
    <a
      href={company.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 min-h-11 hover:bg-medical-50"
    >
      {body}
      <span className="inline-flex items-center gap-1 text-xs font-bold text-medical-700 shrink-0 ml-2">
        Instructions <ExternalLink size={12} aria-hidden="true" />
      </span>
    </a>
  );
}

/**
 * Search hits. Systems come first, and a company hit is labeled instructions.
 * @param {{ systems: Array<object>, companies: Array<object> }} props
 */
export function CatalogResults({ systems, companies }) {
  const uses = systems.map(system => ({
    id: system.id,
    catalogId: system.id,
    name: system.name,
    companyId: system.companyId,
    catalogNumber: '',
    overrideUrl: '',
    repExpected: false,
  }));
  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      <div className="bg-medical-50 border border-medical-200 rounded-2xl p-4 space-y-4">
        {uses.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-medical-600 uppercase tracking-wider mb-2">Systems ({uses.length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uses.map(use => (
                <div key={use.id} className="bg-white rounded-xl px-3 py-2 border border-medical-100">
                  <SystemDoors use={use} />
                </div>
              ))}
            </div>
          </div>
        )}
        {companies.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-medical-600 uppercase tracking-wider mb-2">Company instructions ({companies.length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {companies.map(company => <CompanyLink key={company.id} company={company} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function companyMatches(company, q) {
  return fold(company.name).includes(q)
    || company.aliases.some(alias => fold(alias).includes(q))
    || company.specialties.some(item => fold(specialtyLabel(item)).includes(q) || fold(item).includes(q));
}

function companyNameMatches(company, q) {
  return fold(company.name).includes(q) || company.aliases.some(alias => fold(alias).includes(q));
}

function systemMatches(system, q) {
  const company = getCompany(system.companyId);
  return fold(system.name).includes(q)
    || system.aliases.some(alias => fold(alias).includes(q))
    || fold(system.specialty).includes(q)
    || fold(specialtyLabel(system.specialty)).includes(q)
    || (company && companyNameMatches(company, q));
}

/** The directory. Companies stay grouped by specialty. A search also opens matching systems. */
export function VendorLibrary({ onClose }) {
  const [query, setQuery] = useState('');
  const q = fold(query);
  const systems = useMemo(() => (q ? SYSTEMS.filter(system => systemMatches(system, q)) : []), [q]);
  const companies = useMemo(() => COMPANIES.filter(company => !q || companyMatches(company, q)), [q]);
  const groups = SPECIALTIES
    .map(([id, label]) => ({ id, label, companies: companies.filter(company => company.specialties[0] === id) }))
    .filter(group => group.companies.length > 0);
  const uses = systems.map(system => ({
    id: system.id,
    catalogId: system.id,
    name: system.name,
    companyId: system.companyId,
    catalogNumber: '',
    overrideUrl: '',
    repExpected: false,
  }));
  const dialogRef = useDialog({ onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Systems and companies" className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] overflow-hidden flex flex-col focus:outline-none">
        <div className="flex items-center justify-between px-5 py-2 shrink-0 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm">{q ? 'Matching systems and companies' : `Companies (${COMPANIES.length})`}</p>
          <button type="button" onClick={onClose} aria-label="Close systems and companies" className="tap-icon text-medical-100 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="px-5 pt-5 shrink-0">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Find a system or company"
            placeholder="Find a system or company"
            autoFocus
            className="w-full min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
        </div>
        <div className="p-5 overflow-y-auto flex-1 min-h-0">
        <div className="space-y-5">
          {uses.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Systems ({uses.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uses.map(use => (
                  <div key={use.id} className="bg-slate-50 rounded-xl px-3 py-2">
                    <SystemDoors use={use} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {groups.map(group => (
            <section key={group.id}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{group.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {group.companies.map(company => <CompanyLink key={company.id} company={company} />)}
              </div>
            </section>
          ))}
          {uses.length === 0 && groups.length === 0 && <p className="text-sm text-slate-500">No system or company matches that.</p>}
        </div>
        </div>
      </div>
    </div>
  );
}
