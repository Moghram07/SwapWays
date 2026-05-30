import { describe, it, expect } from "vitest";
import {
  manualSwapTripToView,
  scheduleTripToView,
  mapTripsForChat,
  type ChatTripView,
} from "@/utils/chatTripMapping";

describe("manualSwapTripToView", () => {
  it("reconstructs a multi-stop-through-base route from destinations + base", () => {
    const view = manualSwapTripToView(
      {
        destination: "AHB",
        destinations: ["AHB", "JED", "BHH"],
        departureDate: "2026-07-01",
        reportTime: "10:30",
        flightNumber: "738",
        hasLayover: false,
      },
      "JED"
    );
    expect(view.isManual).toBe(true);
    expect(view.legs.map((l) => `${l.departureAirport}-${l.arrivalAirport}`)).toEqual([
      "JED-AHB",
      "AHB-JED",
      "JED-BHH",
      "BHH-JED",
    ]);
    expect(view.legs[0].flightNumber).toBe("738");
    expect(view.layovers).toHaveLength(0);
  });

  it("marks a layover trip so it classifies as LAYOVER", () => {
    const view = manualSwapTripToView(
      {
        destination: "MED",
        destinations: ["MED"],
        departureDate: "2026-07-04",
        reportTime: "20:15",
        flightNumber: null,
        hasLayover: true,
        layoverCity: "MED",
        layoverHours: 16.5833,
      },
      "JED"
    );
    expect(view.legs.map((l) => `${l.departureAirport}-${l.arrivalAirport}`)).toEqual([
      "JED-MED",
      "MED-JED",
    ]);
    expect(view.layovers).toHaveLength(1);
  });
});

describe("scheduleTripToView", () => {
  it("passes schedule legs through and is not marked manual", () => {
    const view = scheduleTripToView({
      startDate: "2026-07-01",
      reportTime: "02.45",
      legs: [
        { flightNumber: "738", departureAirport: "JED", arrivalAirport: "AHB", departureTime: "03.30", arrivalTime: "05.00" },
        { flightNumber: "739", departureAirport: "AHB", arrivalAirport: "JED", departureTime: "06.00", arrivalTime: "07.30" },
      ],
      layovers: [],
    });
    expect(view.isManual).toBe(false);
    expect(view.legs[0].departureTime).toBe("03.30");
    expect(view.legs).toHaveLength(2);
  });
});

describe("mapTripsForChat", () => {
  const owner: ChatTripView = { startDate: "2026-07-01", reportTime: "10:30", legs: [], layovers: [], isManual: true };
  const offer: ChatTripView = { startDate: "2026-07-02", reportTime: "08:00", legs: [], layovers: [], isManual: true };
  const payload = {
    initiatorId: "init",
    postOwnerId: "owner",
    ownerTripView: owner,
    initiatorTripView: offer,
    currentOfferId: "swap-trip-1",
  };

  it("owner sees their posted trip as myTrip and the offer as theirs", () => {
    const r = mapTripsForChat("owner", payload);
    expect(r.myTrip).toBe(owner);
    expect(r.theirTrip).toBe(offer);
    expect(r.currentOfferId).toBeNull();
  });

  it("initiator sees their offer as myTrip and owner trip as theirs, with the offer id", () => {
    const r = mapTripsForChat("init", payload);
    expect(r.myTrip).toBe(offer);
    expect(r.theirTrip).toBe(owner);
    expect(r.currentOfferId).toBe("swap-trip-1");
  });
});
