import TipsSection from './TipsSection';
import NicknameSection from './NicknameSection';
import LibrarianLinks from './LibrarianLinks';
import CardHistory from './CardHistory';

export default function ExpandedDetails({
  surgeon, proc, onUpdate, onAudit, auditLog,
  updateProcedure, vendorLinks, latexFree, opSide,
}) {
  return (
    <div className="border-t border-slate-100">
      {proc && <TipsSection proc={proc} updateProcedure={updateProcedure} opSide={opSide} />}
      {proc && <NicknameSection proc={proc} updateProcedure={updateProcedure} />}
      <LibrarianLinks surgeon={surgeon} onUpdate={onUpdate} onAudit={onAudit} vendorLinks={vendorLinks} />
      <CardHistory surgeonName={surgeon.name} auditLog={auditLog} />
    </div>
  );
}

