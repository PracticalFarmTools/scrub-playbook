import { useState } from 'react';
import { X, Building2 } from 'lucide-react';

const ROLES = [
  { id: 'tech', label: 'Tech', days: null },
  { id: 'circulator', label: 'Circulator', days: null },
  { id: 'spd', label: 'Sterile processing', days: null },
  { id: 'charge', label: 'Charge', days: null },
  { id: 'educator', label: 'Educator', days: null },
  { id: 'surgeon_viewer', label: 'Surgeon view', days: null },
];

export default function FacilityPanel({ facility, onClose }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [inviteRole, setInviteRole] = useState('tech');
  const [travelerDays, setTravelerDays] = useState('90');
  const [issued, setIssued] = useState('');
  const [vendor, setVendor] = useState('');
  const [item, setItem] = useState('');
  const [overrideUrl, setOverrideUrl] = useState('');

  const input = 'w-full rounded-xl bg-slate-50 border border-slate-200 text-sm px-3 py-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Building2 size={16} /> Facility</p>
          <button onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 text-sm text-slate-600">
          {!facility.configured && (
            <p>Facility mode stays off until this deploy has a Supabase URL and anon key. Your book remains on this device.</p>
          )}

          {facility.configured && facility.status === 'signed-out' && (
            <form onSubmit={(e) => { e.preventDefault(); facility.signIn(email); }} className="space-y-2">
              <p>Sign in with your work email. The link is single-use. Then enter the one-time invite from your educator.</p>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hospital.org" className={input} />
              <button className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">Email me a link</button>
              {facility.emailSent && <p className="text-emerald-700 text-xs">Check your inbox, then come back signed in.</p>}
            </form>
          )}

          {facility.configured && facility.sessionUser && !facility.membership && (
            <div className="space-y-3">
              <p>Signed in as {facility.sessionUser.email}. Join with a one-time invite, or start a facility you will administer.</p>
              <form onSubmit={(e) => { e.preventDefault(); facility.consumeInvite(token); }} className="flex gap-2">
                <input value={token} onChange={e => setToken(e.target.value.toUpperCase())} placeholder="Invite token" className={input} />
                <button className="px-3 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">Join</button>
              </form>
              <form onSubmit={(e) => { e.preventDefault(); facility.createFacility(facilityName); }} className="flex gap-2">
                <input value={facilityName} onChange={e => setFacilityName(e.target.value)} placeholder="Facility name" className={input} />
                <button className="px-3 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">Start</button>
              </form>
            </div>
          )}

          {facility.membership && (
            <div className="space-y-3">
              <p>
                <span className="font-semibold text-slate-800">{facility.facility?.name}</span>
                {' · '}{facility.role}
                {facility.membership.expires_at && ` · access ends ${new Date(facility.membership.expires_at).toLocaleDateString()}`}
              </p>
              {!facility.facility?.baa_attested_at && facility.role === 'educator' && (
                <button onClick={facility.attestBaa} className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold cursor-pointer">
                  I attest this project is covered by a business associate agreement
                </button>
              )}
              {!facility.facility?.baa_attested_at && (
                <p className="text-xs text-amber-800">Cards stay locked until that attestation is saved. No operating-room notes should be entered before it.</p>
              )}
              {facility.role === 'educator' && facility.facility?.baa_attested_at && (
                <>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const days = inviteRole === 'tech' && travelerDays ? Number(travelerDays) : null;
                    const code = await facility.createInvite(inviteRole, inviteRole === 'tech' && travelerDays ? days : null);
                    if (code) setIssued(code);
                  }} className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">One-time invite</p>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={input}>
                      {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    {inviteRole === 'tech' && (
                      <input value={travelerDays} onChange={e => setTravelerDays(e.target.value)} placeholder="Days until access ends (blank for staff)" className={input} />
                    )}
                    <button className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">Create invite</button>
                    {issued && <p className="font-mono text-center text-lg tracking-widest text-slate-900">{issued}</p>}
                    <p className="text-[11px] text-slate-400">Read this token once. It dies after one sign-in and is not a standing facility password.</p>
                  </form>
                  <form onSubmit={(e) => { e.preventDefault(); facility.addFormulary({ vendor_name: vendor, item_label: item, override_url: overrideUrl || null }); setVendor(''); setItem(''); setOverrideUrl(''); }} className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Formulary</p>
                    <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Company" className={input} />
                    <input value={item} onChange={e => setItem(e.target.value)} placeholder="Product the hospital stocks" className={input} />
                    <input value={overrideUrl} onChange={e => setOverrideUrl(e.target.value)} placeholder="https:// product page, optional" className={input} />
                    <button className="w-full py-2 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">Add to formulary</button>
                  </form>
                  <button onClick={facility.closeFacility} className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 font-bold cursor-pointer">Close this facility</button>
                </>
              )}
              <button onClick={facility.signOut} className="w-full py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer">Sign out</button>
            </div>
          )}

          {facility.error && <p className="text-xs text-rose-600">{facility.error}</p>}
        </div>
      </div>
    </div>
  );
}
