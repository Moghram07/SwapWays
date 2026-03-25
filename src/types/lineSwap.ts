import type { LineType } from "@/types/enums";

export interface LineSwapLayoverInput {
  destination: string;
  hours: number;
  minutes?: number;
}

export interface CreateLineSwapPostInput {
  lineNumber: string;
  lineType: LineType;
  month: string;
  year: number;
  totalBlock?: number | null;
  daysOffStart: number;
  daysOffEnd: number;
  hasReserve: boolean;
  reserveDays: number[];
  wantDaysOffStart?: number | null;
  wantDaysOffEnd?: number | null;
  wantDestination?: string | null;
  wantLineType?: LineType | null;
  wantNoReserve: boolean;
  notes?: string | null;
  scheduleId?: string | null;
  layovers: LineSwapLayoverInput[];
}
