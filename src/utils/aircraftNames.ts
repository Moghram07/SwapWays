/**
 * Schedule aircraft codes to display names.
 * Matches Saudia schedule format (32N, 33R, 789, etc.).
 */

const AIRCRAFT_NAMES: Record<string, string> = {
  "32N": "A320",
  "32U": "A320",
  A320: "A320",
  "323": "A321",
  A321: "A321",
  "33R": "A330",
  "33D": "A330",
  "333": "A330",
  A330: "A330",
  "77H": "B777",
  "77U": "B777",
  B777: "B777",
  "780": "B787",
  "789": "B787",
  B787: "B787",
};

export function getAircraftName(code: string): string {
  return AIRCRAFT_NAMES[code] ?? code;
}
