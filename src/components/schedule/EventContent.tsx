"use client";

import { Moon } from "lucide-react";
import type { CalendarTripEvent } from "@/types/calendar";

export function EventContent({ event }: { event: CalendarTripEvent }) {
  switch (event.dayRole) {
    case "SAME_DAY":
      return <SameDayContent event={event} />;
    case "DEPART_ONLY":
    case "DEPART_WITH_LAYOVER":
    case "DEPART_OVERNIGHT":
      return <DepartContent event={event} />;
    case "RETURN_ONLY":
    case "RETURN_EARLY":
      return <ReturnContent event={event} />;
    case "ARRIVAL_ONLY":
      return <ArrivalOnlyContent event={event} />;
    case "LAYOVER_DAY":
      return <LayoverContent event={event} />;
    case "MULTI_STOP":
      return <MultiStopContent event={event} />;
    default:
      return null;
  }
}

function SameDayContent({ event }: { event: CalendarTripEvent }) {
  const outbound = event.legs[0];
  const returnLeg = event.legs[1];

  return (
    <div>
      <div className="font-semibold truncate">{event.destinationCity}</div>
      {outbound && (
        <div className="truncate">
          {outbound.departureLocal} SV{outbound.flightNumber} →
        </div>
      )}
      {returnLeg && (
        <div className="truncate opacity-75">
          ← arr {returnLeg.arrivalLocal} ✓
        </div>
      )}
    </div>
  );
}

function formatZulu(timeZ: string): string {
  return (timeZ ?? "").replace(".", ":").replace(/Z?$/, "Z");
}

function DepartContent({ event }: { event: CalendarTripEvent }) {
  const leg = event.legs[0];
  if (!leg) return null;
  const zuluStr = formatZulu(leg.departureTimeZ);
  const showLocalNextDay = leg.departureLocalNextDay;

  return (
    <div>
      <div className="font-semibold truncate">→ {event.destinationCity}</div>
      <div className="truncate">
        {showLocalNextDay ? (
          <>
            {zuluStr} ({leg.departureLocal}
            <span className="ml-1 text-amber-600">+1d</span> local)
          </>
        ) : (
          leg.departureLocal
        )}{" "}
        SV{leg.flightNumber}
      </div>
      <div className="truncate opacity-75">
        {leg.departureAirport} → {leg.arrivalAirport}
        {event.dayRole === "DEPART_OVERNIGHT" ? " 🌙" : ""}
      </div>
      {event.continuesTomorrow && (
        <div className="opacity-60 italic">⤷ continues →</div>
      )}
    </div>
  );
}

function ReturnContent({ event }: { event: CalendarTripEvent }) {
  const leg = event.legs[0];
  if (!leg) return null;

  return (
    <div>
      <div className="font-semibold truncate opacity-75">
        ← {event.destinationCity}
      </div>
      <div className="truncate">
        {leg.departureLocal} SV{leg.flightNumber}
      </div>
      <div className="truncate">
        {leg.departureAirport} → {leg.arrivalAirport}
        {leg.crossesMidnight
          ? ` arr ${leg.arrivalLocal} +1d`
          : ` arr ${leg.arrivalLocal}`}
      </div>
      {!event.continuesTomorrow && (
        <div className="opacity-60">✓ duty complete</div>
      )}
    </div>
  );
}

function ArrivalOnlyContent({ event }: { event: CalendarTripEvent }) {
  const leg = event.legs[0];
  const arrivalAirport = leg?.arrivalAirport ?? "base";

  return (
    <div className="opacity-75">
      <div className="font-semibold truncate">← arrives {arrivalAirport}</div>
      <div className="truncate">{leg?.arrivalLocal} ✓ duty complete</div>
    </div>
  );
}

function LayoverContent({ event }: { event: CalendarTripEvent }) {
  const city = event.layoverCity ?? event.destinationCity;
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 font-semibold truncate text-[#3BA34A]">
        <Moon size={14} className="shrink-0 text-[#3BA34A]" />
        <span className="truncate">{city}</span>
      </div>
      <div className="opacity-75 truncate">Layover</div>
    </div>
  );
}

function MultiStopContent({ event }: { event: CalendarTripEvent }) {
  return (
    <div>
      <div className="font-semibold truncate">{event.destinationCity}</div>
      {event.legs.slice(0, 3).map((leg, i) => (
        <div key={i} className="truncate">
          {leg.departureLocal} SV{leg.flightNumber} {leg.departureAirport}→
          {leg.arrivalAirport}
        </div>
      ))}
      {event.legs.length > 3 && (
        <div className="opacity-60">+{event.legs.length - 3} more</div>
      )}
      <div className="opacity-60">
        ✓ {event.legs[event.legs.length - 1]?.arrivalLocal}
      </div>
    </div>
  );
}
