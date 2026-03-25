"use client";

import { Moon } from "lucide-react";
import { getAirportCity } from "@/utils/airportNames";
import type { TripCardLayover } from "@/types/tripCard";

interface TripLayoverBarProps {
  layover: TripCardLayover;
}

export function TripLayoverBar({ layover }: TripLayoverBarProps) {
  const cityName = getAirportCity(layover.airport);
  const hours = Math.floor(layover.durationDecimal);
  const minutes = Math.round((layover.durationDecimal - hours) * 60);
  const nights = Math.floor(layover.durationDecimal / 24);
  const nightsLabel =
    nights > 0 ? ` (${nights} ${nights === 1 ? "night" : "nights"})` : "";
  return (
    <div className="mx-2 my-3 rounded-lg border border-[#3BA34A]/20 bg-[#E8F5EA] px-4 py-3">
      <div className="flex items-center gap-2">
        <Moon size={18} className="text-[#3BA34A]" />
        <span className="font-semibold text-[#3BA34A]">
          Layover in {cityName}
        </span>
        <span className="font-medium text-[#3BA34A]/80">
          — {hours}h {minutes.toString().padStart(2, "0")}m
          {nightsLabel}
        </span>
      </div>
    </div>
  );
}
