import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { normalizeBlocks } from '../data/schema';
import CaseBody from './CaseBody';

/** Every matched case on the board, one per page, for a printed pull list. */
export default function PrintDay({ cases, staleDays, trustFor, onDone }) {
  useEffect(() => {
    const done = () => onDone?.();
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [onDone]);

  return createPortal(
    <div id="print-day-root" className="print-root" aria-hidden="true">
      {cases.map(({ surgeon, procedure, item }, index) => (
        <div key={`${procedure.id}-${index}`} className="print-case">
          <CaseBody
            surgeon={surgeon}
            procedure={procedure}
            blocks={normalizeBlocks(procedure.blocks)}
            staleDays={staleDays}
            trust={trustFor?.(procedure)}
            dark={false}
            board={item}
            checks={{}}
            idPrefix={`print-${index}`}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
