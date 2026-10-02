// Shared display helpers (no React here, so components files only export components).

/** "LKR 45,000" */
export const formatLKR = (amount) => `LKR ${Math.round(Number(amount) || 0).toLocaleString('en-LK')}`;

/** Fair-price verdict -> badge colour + label. */
const VERDICTS = {
  SUSPICIOUSLY_LOW: { variant: 'danger', label: 'Suspiciously low' },
  GREAT_DEAL: { variant: 'success', label: 'Great deal' },
  FAIR: { variant: 'success', label: 'Fair price' },
  SLIGHTLY_HIGH: { variant: 'warning', label: 'Slightly high' },
  OVERPRICED: { variant: 'danger', label: 'Overpriced' },
  UNKNOWN: { variant: 'neutral', label: 'No price data' }
};
export const verdictInfo = (verdict) => VERDICTS[verdict] || VERDICTS.UNKNOWN;
