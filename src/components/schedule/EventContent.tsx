"use client";

import { Moon } from "lucide-react";
import type { CalendarTripEvent } from "@/types/calendar";

interface EventContentProps {
  event: CalendarTripEvent;
  variant?: "grid" | "agenda";
}

function lineClass(variant: "grid" | "agenda"): string {
  return variant === "agenda" ? "break-words" : "truncate";
}

export function EventContent({ event, variant = "grid" }: EventContentProps) {
  switch (event.dayRole) {
    case "SAME_DAY":
      return <SameDayContent event={event} variant={variant} />;
    case "DEPART_ONLY":
    case "DEPART_WITH_LAYOVER":
    case "DEPART_OVERNIGHT":
      return <DepartContent event={event} variant={variant} />;
    case "RETURN_ONLY":
    case "RETURN_EARLY":
      return <ReturnContent event={event} variant={variant} />;
    case "ARRIVAL_ONLY":
      return <ArrivalOnlyContent event={event} variant={variant} />;
    case "LAYOVER_DAY":
      return <LayoverContent event={event} variant={variant} />;
    case "MULTI_STOP":
      return <MultiStopContent event={event} variant={variant} />;
    default:
      return null;
  }
}

function SameDayContent({ event, variant }: { event: CalendarTripEvent; variant: "grid" | "agenda" }) {
  const outbound = event.legs[0];
  const returnLeg = event.legs[1];
  const line = lineClass(variant);

  return (
    <div>
      <div className={`font-semibold ${line}`}>{event.destinationCity}</div>
      {outbound && (
        <div className={line}>
          {outbound.departureLocal} SV{outbound.flightNumber} →
        </div>
      )}
      {returnLeg && (
        <div className={`${line} opacity-75`}>
          ← arr {returnLeg.arrivalLocal} ✓
        </div>
      )}
    </div>
  );
}

function formatZulu(timeZ: string): string {
  return (timeZ ?? "").replace(".", ":").replace(/Z?$/, "Z");
}

function DepartContent({ event, variant }: { event: CalendarTripEvent; variant: "grid" | "agenda" }) {
  const leg = event.legs[0];
  if (!leg) return null;
  const zuluStr = formatZulu(leg.departureTimeZ);
  const showLocalNextDay = leg.departureLocalNextDay;
  const line = lineClass(variant);

  return (
    <div>
      <div className={`font-semibold ${line}`}>→ {event.destinationCity}</div>
      <div className={line}>
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
      <div className={`${line} opacity-75`}>
        {leg.departureAirport} → {leg.arrivalAirport}
        {event.dayRole === "DEPART_OVERNIGHT" ? " 🌙" : ""}
      </div>
      {event.continuesTomorrow && (
        <div className="opacity-60 italic">⤷ continues →</div>
      )}
    </div>
  );
}

function ReturnContent({ event, variant }: { event: CalendarTripEvent; variant: "grid" | "agenda" }) {
  const leg = event.legs[0];
  if (!leg) return null;
  const line = lineClass(variant);

  return (
    <div>
      <div className={`font-semibold ${line} opacity-75`}>
        ← {event.destinationCity}
      </div>
      <div className={line}>
        {leg.departureLocal} SV{leg.flightNumber}
      </div>
      <div className={line}>
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

function ArrivalOnlyContent({ event, variant }: { event: CalendarTripEvent; variant: "grid" | "agenda" }) {
  const leg = event.legs[0];
  const arrivalAirport = leg?.arrivalAirport ?? "base";
  const line = lineClass(variant);

  return (
    <div className="opacity-75">
      <div className={`font-semibold ${line}`}>← arrives {arrivalAirport}</div>
      <div className={line}>{leg?.arrivalLocal} ✓ duty complete</div>
    </div>
  );
}

function LayoverContent({ event, variant }: { event: CalendarTripEvent; variant: "grid" | "agenda" }) {
  const city = event.layoverCity ?? event.destinationCity;
  const line = lineClass(variant);
  return (
    <div>
      <div className={`inline-flex items-center gap-1.5 font-semibold text-[#3BA34A] ${line}`}>
        <Moon size={14} className="shrink-0 text-[#3BA34A]" />
        <span className={line}>{city}</span>
      </div>
      <div className={`${line} opacity-75`}>Layover</div>
    </div>
  );
}

function MultiStopContent({ event, variant }: { event: CalendarTripEvent; variant: "grid" | "agenda" }) {
  const line = lineClass(variant);
  return (
    <div>
      <div className={`font-semibold ${line}`}>{event.destinationCity}</div>
      {event.legs.slice(0, 3).map((leg, i) => (
        <div key={i} className={line}>
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
