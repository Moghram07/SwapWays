"use client";

import { Fragment } from "react";
import { Moon, Clock, Plane } from "lucide-react";
import { AirportNode, type AirportNodeVariant } from "@/components/swap-post/AirportNode";
import { creditHoursToHumanReadable } from "@/utils/timeUtils";
import { getAirportCity } from "@/utils/airportNames";
import type { RouteChainNode } from "@/utils/multiStopRouteDisplay";

type TripTypeKey = "LAYOVER" | "ROUND_TRIP" | "MULTI_STOP" | "TURNAROUND";

const tripTypeVariant: Record<TripTypeKey, AirportNodeVariant> = {
  LAYOVER:    "green",
  ROUND_TRIP: "blue",
  MULTI_STOP: "orange",
  TURNAROUND: "blue",
};

const variantBarColor: Record<AirportNodeVariant, string> = {
  green:  "border-[#3BA34A]/20 bg-green-50 text-[#3BA34A]",
  blue:   "border-[#2668B0]/20 bg-blue-50 text-[#2668B0]",
  orange: "border-amber-300/50 bg-amber-50 text-amber-700",
  purple: "border-orange-300/50 bg-purple-50 text-purple-700",
};

export function RouteChain({
  nodes,
  nodeTimes,
  tripType,
  timeColor,
  className,
  legDeadheads,
}: {
  nodes: RouteChainNode[];
  nodeTimes?: (string | null | undefined)[];
  tripType?: TripTypeKey | string | null;
  timeColor?: string;
  className?: string;
  legDeadheads?: boolean[];
}) {
  if (!nodes.length) return null;

  const variant: AirportNodeVariant =
    tripTypeVariant[(tripType ?? "") as TripTypeKey] ?? "green";
  const barColorCls = variantBarColor[variant];

  const layoverNodes = nodes.filter((n) => n.layoverHours != null);
  const deadheadCount = legDeadheads?.filter(Boolean).length ?? 0;

  // Group repeated layovers by city so e.g. two 18h Madinah layovers render once as
  // "2 Layovers in Madinah 18h" instead of two identical rows.
  const layoverGroups = (() => {
    const byCode = new Map<string, number[]>();
    const order: string[] = [];
    for (const n of layoverNodes) {
      if (!byCode.has(n.code)) {
        byCode.set(n.code, []);
        order.push(n.code);
      }
      byCode.get(n.code)!.push(n.layoverHours!);
    }
    return order.map((code) => ({ code, hours: byCode.get(code)! }));
  })();

  // Highlight non-base destination nodes for these trip types
  // "Round Trip" in the UI stores as TURNAROUND in the DB
  const highlightNonBase = tripType === "TURNAROUND" || tripType === "ROUND_TRIP" || tripType === "MULTI_STOP";
  const baseCode = nodes[0]?.code;
  const highlightVariant: AirportNodeVariant = variant;

  return (
    <div className={`w-full ${className ?? ""}`}>
      <div className="flex w-full items-center">
        {nodes.map((node, i) => {
          const isLast = i === nodes.length - 1;
          const isHighlighted =
            highlightNonBase && node.layoverHours == null && node.code !== baseCode;
          return (
            <Fragment key={i}>
              <div className="flex flex-1 justify-center">
                <AirportNode
                  code={node.code}
                  isLayover={node.layoverHours != null}
                  isHighlighted={isHighlighted}
                  variant={isHighlighted ? highlightVariant : variant}
                  time={nodeTimes?.[i] ?? undefined}
                  timeColor={timeColor}
                />
              </div>
              {!isLast && (
                <div className="shrink-0 flex flex-col items-center pt-4 gap-0.5">
                  <Plane
                    className={`h-3 w-3 ${legDeadheads?.[i] ? "text-purple-500" : "text-gray-400"}`}
                    aria-hidden
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {deadheadCount > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700">
            <Plane className="h-3 w-3 shrink-0 text-purple-500" />
            <span>
              {deadheadCount > 1
                ? `${deadheadCount} Dead head legs (no duty)`
                : "Dead head leg (no duty)"}
            </span>
          </div>
        </div>
      )}

      {layoverGroups.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {layoverGroups.map((group, i) => {
            // When every layover in this city has the same duration, show one duration
            // (and its nights). When they differ, list the distinct durations together.
            const distinctHours = group.hours.filter((h, idx) => group.hours.indexOf(h) === idx);
            const count = group.hours.length;
            const singleDuration = distinctHours.length === 1;
            const durationLabel = distinctHours.map((h) => creditHoursToHumanReadable(h)).join(", ");
            const hours = distinctHours[0]!;
            const nights = singleDuration && hours >= 8 ? Math.max(1, Math.round(hours / 24)) : 0;
            return (
              <div
                key={i}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${barColorCls}`}
              >
                <span className="font-semibold">
                  {count > 1
                    ? `${count} Layovers in ${getAirportCity(group.code)}`
                    : `Layover in ${getAirportCity(group.code)}`}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {durationLabel}
                </span>
                {nights > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Moon className="h-3 w-3" />
                    {nights} Night{nights > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
