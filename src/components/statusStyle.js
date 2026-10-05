import { CARD_STATUS } from '../data/schema';

export const STATUS_CLASS = {
  [CARD_STATUS.CONFIRMED]: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  [CARD_STATUS.NOTED]: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  [CARD_STATUS.UNCONFIRMED]: 'bg-amber-50 text-amber-900 border-amber-200',
  [CARD_STATUS.STALE]: 'bg-amber-50 text-amber-900 border-amber-300',
  [CARD_STATUS.DISPUTED]: 'bg-rose-50 text-rose-800 border-rose-200',
};
