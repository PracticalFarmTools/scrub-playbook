import { worklistItems } from '../data/trust';

export default function Worklist({ procedures, surgeons, staleDays }) {
  const items = worklistItems(procedures, { staleDays });
  if (items.length === 0) return null;
  return (
    <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">Official-card worklist</p>
      <ul className="space-y-1">
        {items.map(procedure => {
          const surgeon = surgeons.find(s => s.id === procedure.surgeonId);
          const reason = procedure.reported
            ? 'Not about the setup'
            : procedure.official?.reviewedAt && new Date(procedure.updatedAt) > new Date(procedure.official.reviewedAt)
              ? 'Changed after the official card was reviewed'
              : 'Stale';
          return (
            <li key={procedure.id} className="text-sm text-amber-950">
              <span className="font-semibold">{surgeon?.name}</span> · {procedure.name}
              <span className="text-amber-800"> — {reason}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
