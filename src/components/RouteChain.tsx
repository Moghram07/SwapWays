"use client";

import { Fragment } from "react";
import { Moon, Clock, Plane } from "lucide-react";
import { AirportNode, type AirportNodeVariant } from "@/components/swap-post/AirportNode";
import { creditHoursToHumanReadable } from "@/utils/timeUtils";
import { getAirportCity } from "@/utils/airportNames";
import type { RouteChainNode } from "@/utils/multiStopRouteDisplay";

type TripTypeKey = "LAYOVER" | "ROUND_TRIP" | "MULTI_STOP" | "PAIRING_WITH_LAYOVER" | "TURNAROUND";

const tripTypeVariant: Record<TripTypeKey, AirportNodeVariant> = {
  LAYOVER:              "green",
  ROUND_TRIP:           "blue",
  MULTI_STOP:           "orange",
  PAIRING_WITH_LAYOVER: "purple",
  TURNAROUND:           "green",
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
}: {
  nodes: RouteChainNode[];
  nodeTimes?: (string | null | undefined)[];
  tripType?: TripTypeKey | string | null;
  timeColor?: string;
  className?: string;
}) {
  if (!nodes.length) return null;

  const variant: AirportNodeVariant =
    tripTypeVariant[(tripType ?? "") as TripTypeKey] ?? "green";
  const barColorCls = variantBarColor[variant];

  const layoverNodes = nodes.filter((n) => n.layoverHours != null);

  return (
    <div className={`w-full ${className ?? ""}`}>
      <div className="flex w-full items-center">
        {nodes.map((node, i) => {
          const isLast = i === nodes.length - 1;
          return (
            <Fragment key={i}>
              <div className="flex flex-1 justify-center">
                <AirportNode
                  code={node.code}
                  isLayover={node.layoverHours != null}
                  variant={variant}
                  time={nodeTimes?.[i] ?? undefined}
                  timeColor={timeColor}
                />
              </div>
              {!isLast && (
                <div className="shrink-0 flex items-center pt-4">
                  <Plane className="h-3 w-3 text-gray-400" aria-hidden />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {layoverNodes.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {layoverNodes.map((node, i) => {
            const hours = node.layoverHours!;
            const nights = hours >= 8 ? Math.max(1, Math.round(hours / 24)) : 0;
            const durationLabel = creditHoursToHumanReadable(hours);
            return (
              <div
                key={i}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${barColorCls}`}
              >
                <span className="font-semibold">
                  Layover in {getAirportCity(node.code)}
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
