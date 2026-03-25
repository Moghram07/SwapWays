export function formatCreditHours(hours: number | null | undefined): string {
  if (hours == null) return "—";
  return `${hours.toFixed(1)}h`;
}
