import { describe, it, expect } from "vitest";
import { detectScheduleFormat } from "../../src/services/schedule/detectScheduleFormat";

describe("detectScheduleFormat", () => {
  it("detects CALENDAR when weekday row, Report/Release, and Hotel present", () => {
    const text = `
      Sunday Monday Tuesday Wednesday Thursday Friday Saturday
      Report 04:00 Release 22:00
      Hotel CAI
    `.trim();
    expect(detectScheduleFormat(text)).toBe("CALENDAR");
  });

  it("detects LINE with LINE header, credit/block, and trip headers", () => {
    const text = `
      LINE1300 CR. 82.10
      BLK 82.10
      #003 REPORT AT 22:55Z
    `;
    expect(detectScheduleFormat(text)).toBe("LINE");
  });

  it("returns UNKNOWN when signals are mixed or absent", () => {
    expect(detectScheduleFormat("random memo about flights")).toBe("UNKNOWN");
  });
});
