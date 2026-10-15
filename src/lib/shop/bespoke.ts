/** "Ships to" on a bespoke payment link: the customer picks any country we ship to. */
export const ANY_COUNTRY = 'ANY';

/**
 * Bespoke entries are created as `bespokeOrder.<id>`: Sanity serves any id
 * containing a dot only with a token, so they stay private in the public
 * dataset (see src/sanity/structure.ts).
 */
export const BESPOKE_ID_PREFIX = 'bespokeOrder.';
