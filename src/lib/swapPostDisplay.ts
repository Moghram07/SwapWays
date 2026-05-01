/** Swap list / history: hide rows with nothing to show under Offering (orphan OFFERING_TRIPS, etc.). */
export function swapPostHasDisplayableOffer(post: {
  postType: string;
  offeredTrips?: { departureDate?: unknown }[] | null;
  quickDate?: Date | string | null;
  offeringDaysOff?: boolean | null;
  offeredDaysOff?: number[] | null;
  vacationStartDate?: Date | string | null;
  vacationEndDate?: Date | string | null;
  vacationYear?: number | null;
  vacationMonth?: number | null;
}): boolean {
  if (post.postType === "VACATION_SWAP") {
    return Boolean(
      post.vacationStartDate ||
      post.vacationEndDate ||
      (post.vacationYear != null && post.vacationMonth != null)
    );
  }
  if (post.postType === "OFFERING_DAYS_OFF") {
    return Boolean(post.offeringDaysOff && (post.offeredDaysOff?.length ?? 0) > 0);
  }
  if (post.postType === "OFFERING_TRIPS") {
    const trips = post.offeredTrips ?? [];
    return trips.length > 0 || post.quickDate != null;
  }
  const trips = post.offeredTrips ?? [];
  return trips.length > 0 || post.quickDate != null;
}
