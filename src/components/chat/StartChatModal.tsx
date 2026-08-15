"use client";

import { useState } from "react";
import { getAirportCity } from "@/utils/airportNames";
import { classifyTrip, getTripTypeInfo } from "@/utils/tripClassifier";
import { useAirlineCode } from "@/hooks/useAirlineCode";

interface Leg {
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
}

interface TripLike {
  id: string;
  tripNumber: string;
  startDate: string | Date;
  legs: Leg[];
  layovers?: unknown[];
  tripType?: string;
}

interface TradeWithTrip {
  id: string;
  scheduleTrip: TripLike | null;
}

export interface MyTripOption {
  id: string;
  tripNumber: string;
  startDate: string | Date;
  legs: Leg[];
  layovers?: unknown[];
  tripType?: string;
}

interface StartChatModalProps {
  trade: TradeWithTrip | null;
  myTrips: MyTripOption[];
  isOpen: boolean;
  onClose: () => void;
  onStart: (data: { tradeId: string; offeredTripId?: string; message: string }) => void;
}

function TripMiniCard({ trip }: { trip: TripLike }) {
  const airlineCode = useAirlineCode();
  const firstLeg = trip.legs?.[0];
  if (!firstLeg) return <span className="text-sm text-muted">—</span>;
  const tripType = classifyTrip({ legs: trip.legs ?? [], layovers: trip.layovers ?? [] });
  const typeInfo = getTripTypeInfo(tripType);
  const startDate = typeof trip.startDate === "string" ? new Date(trip.startDate) : trip.startDate;
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.bgColor} ${typeInfo.textColor}`}>
        {typeInfo.label}
      </span>
      <span className="text-sm font-semibold">{airlineCode}{firstLeg.flightNumber}</span>
      <span className="text-sm text-muted">
        {getAirportCity(firstLeg.departureAirport)} → {getAirportCity(firstLeg.arrivalAirport)}
      </span>
      <span className="text-xs text-muted">
        {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}

export function StartChatModal({ trade, myTrips, isOpen, onClose, onStart }: StartChatModalProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [message, setMessage] = useState("");
  const airlineCode = useAirlineCode();

  if (!isOpen) return null;
  if (!trade) return null;

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onStart({
      tradeId: trade.id,
      offeredTripId: selectedTripId || undefined,
      message: trimmed,
    });
    setMessage("");
    setSelectedTripId("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl max-w-lg w-full shadow-xl">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold">Start a conversation</h2>
          <p className="text-sm text-muted mt-1">
            Message this crew member about their swap
          </p>
        </div>
        {trade.scheduleTrip && (
          <div className="px-6 py-3 bg-surface-2 border-b border-line">
            <p className="text-xs text-faint mb-1">Their trip</p>
            <TripMiniCard trip={trade.scheduleTrip} />
          </div>
        )}
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-content-soft mb-2">
            Which of your trips would you offer?
          </label>
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full text-content bg-surface border border-line rounded-lg px-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[#1E6FB9] focus:border-[#1E6FB9]"
          >
            <option value="">Not sure yet — just want to ask</option>
            {myTrips.map((trip) => {
              const firstLeg = trip.legs?.[0];
              const typeLabel = trip.tripType === "LAYOVER" ? " (Layover)" : "";
              return (
                <option key={trip.id} value={trip.id}>
                  {airlineCode}{firstLeg?.flightNumber ?? "—"} ·{" "}
                  {firstLeg ? getAirportCity(firstLeg.arrivalAirport) : "—"} ·{" "}
                  {new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {typeLabel}
                </option>
              );
            })}
          </select>
        </div>
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-content-soft mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi, I'm interested in your swap. Would you consider..."
            className="w-full text-content bg-surface border border-line rounded-lg px-3 py-2 text-sm placeholder:text-faint resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#1E6FB9] focus:border-[#1E6FB9]"
          />
        </div>
        <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:bg-surface-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="px-6 py-2 text-sm font-medium bg-[#1E6FB9] text-white rounded-lg hover:bg-[#1a5a9e] disabled:opacity-50"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
