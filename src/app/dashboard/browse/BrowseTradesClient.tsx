"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TradeFilters } from "@/components/trade/TradeFilters";
import { TradeList } from "@/components/trade/TradeList";
import { StartChatModal, type MyTripOption } from "@/components/chat/StartChatModal";

export function BrowseTradesClient() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [destination, setDestination] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [trades, setTrades] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTrips, setMyTrips] = useState<MyTripOption[]>([]);
  const [chatModalTrade, setChatModalTrade] = useState<{
    id: string;
    scheduleTrip: MyTripOption | null;
  } | null>(null);

  function buildUrl() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (destination) params.set("destination", destination);
    if (tradeType) params.set("tradeType", tradeType);
    return `/api/trades?${params.toString()}`;
  }

  function fetchTrades() {
    setLoading(true);
    fetch(buildUrl())
      .then((r) => r.json().catch(() => ({})))
      .then((json) => {
        setTrades(json.data?.items ?? []);
      })
      .catch(() => setTrades([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTrades();
  }, [dateFrom, dateTo, destination, tradeType]);

  useEffect(() => {
    fetch("/api/schedule/my-trips")
      .then((r) => r.json().catch(() => ({})))
      .then((json) => {
        if (json.data) setMyTrips(json.data);
      })
      .catch(() => setMyTrips([]));
  }, []);

  async function handleMessageClick(trade: { id: string }) {
    const res = await fetch(`/api/trades/${trade.id}/preview`);
    const json = await res.json().catch(() => ({}));
    if (json.data) {
      setChatModalTrade({
        id: json.data.id,
        scheduleTrip: json.data.scheduleTrip ?? null,
      });
    }
  }

  function handleStartChat(data: { tradeId: string; offeredTripId?: string; message: string }) {
    fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tradeId: data.tradeId,
        offeredTripId: data.offeredTripId || null,
        initialMessage: data.message,
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((json) => {
        const convId = json.data?.id;
        if (convId) {
          setChatModalTrade(null);
          router.push(`/dashboard/messages?conversation=${convId}`);
        }
      })
      .catch(() => {});
  }

  function handleReset() {
    setDateFrom("");
    setDateTo("");
    setDestination("");
    setTradeType("");
  }

  return (
    <>
      <TradeFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        destination={destination}
        tradeType={tradeType}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onDestinationChange={setDestination}
        onTradeTypeChange={setTradeType}
        onReset={handleReset}
      />
      {loading ? (
        <p className="py-8 text-center text-slate-600">Loading…</p>
      ) : (
        <TradeList
          trades={trades as Parameters<typeof TradeList>[0]["trades"]}
          showRequestButton
          onMessage={handleMessageClick}
        />
      )}
      <StartChatModal
        trade={chatModalTrade}
        myTrips={myTrips}
        isOpen={!!chatModalTrade}
        onClose={() => setChatModalTrade(null)}
        onStart={handleStartChat}
      />
    </>
  );
}
