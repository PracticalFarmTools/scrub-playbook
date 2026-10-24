import { ExternalLink } from 'lucide-react';
import { resolveProductLink } from '../data/productLink';

/**
 * The product name is a link only for a verified product page, a catalog
 * code the card actually stored, or a hospital https override.
 * Company pages stay a separate control so a portal is not mistaken for the product.
 * @param {{ productId?: string, catalogNumber?: string, overrideUrl?: string, vendorName?: string, children?: import('react').ReactNode, className?: string, showCompany?: boolean }} props
 */
export default function ProductLink({ productId, catalogNumber, overrideUrl, vendorName, children, className = '', showCompany = true }) {
  const link = resolveProductLink({ productId, catalogNumber, overrideUrl, vendorName });
  const nameIsLink = link && (link.kind === 'product-page' || link.kind === 'catalog-code' || link.kind === 'hospital');

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {nameIsLink ? (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-medical-300 underline-offset-2 hover:decoration-medical-600">
          {children}
          <ExternalLink size={11} className="opacity-60" />
        </a>
      ) : (
        <span>{children}</span>
      )}
      {link?.kind === 'hospital' && (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hospital link</span>
      )}
      {showCompany && link?.kind === 'company' && (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-medical-600 hover:text-medical-800">
          {link.label}
        </a>
      )}
    </span>
  );
}
