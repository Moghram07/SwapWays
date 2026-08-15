/**
 * Only this airline's schedule format can be parsed today.
 *
 * Lives here rather than in `featureGates.ts` so client components can import it
 * without pulling `prisma` (and therefore `pg`/`tls`) into the browser bundle.
 */
export const SCHEDULE_UPLOAD_AIRLINE_CODE = "SV";
