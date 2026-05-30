import { describe, it, expect } from "vitest";
import { buildTripRouteChainNodes } from "@/utils/multiStopRouteDisplay";

/**
 * Regression: a manually-entered multi-stop trip that routes back through base
 * (JED → AHB → JED → BHH → JED) was rendering as JED → AHB → BHH → JED because the
 * server stripped EVERY base occurrence from `destinations`. Manual posts have no
 * legs, so the route chain is rebuilt from `destinations` — the intermediate JED
 * must survive, otherwise the route collapses and per-leg deadhead/layover indices
 * shift out of alignment.
 */
describe("manual multi-stop route through base", () => {
  it("preserves the intermediate base waypoint", () => {
    const nodes = buildTripRouteChainNodes({
      destination: "AHB",
      destinations: ["AHB", "JED", "BHH"], // interim stops as stored (base NOT stripped)
      baseCode: "JED",
      layoverCity: null,
      layoverHours: null,
      legLayovers: null,
      legs: null,
    });
    expect(nodes.map((n) => n.code)).toEqual(["JED", "AHB", "JED", "BHH", "JED"]);
  });

  it("keeps deadhead-segment alignment: 4 segments for the 4 entered legs", () => {
    const nodes = buildTripRouteChainNodes({
      destination: "AHB",
      destinations: ["AHB", "JED", "BHH"],
      baseCode: "JED",
      legs: null,
    });
    // legDeadheads = [false, false, false, true] (BHH→JED is the deadhead leg).
    const segments = nodes.length - 1;
    expect(segments).toBe(4);
    const legDeadheads = [false, false, false, true];
    // The deadhead flag lands on the final BHH→JED segment.
    expect(legDeadheads[segments - 1]).toBe(true);
    expect(nodes[segments - 1].code).toBe("BHH");
    expect(nodes[segments].code).toBe("JED");
  });

  it("still collapses a simple turnaround (JED → AHB → JED) without a phantom stop", () => {
    const nodes = buildTripRouteChainNodes({
      destination: "AHB",
      destinations: ["AHB"],
      baseCode: "JED",
      legs: null,
    });
    expect(nodes.map((n) => n.code)).toEqual(["JED", "AHB", "JED"]);
  });
});
