import { BrowseTradesClient } from "./BrowseTradesClient";

export default function BrowsePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a365d]">Browse trades</h1>
      <BrowseTradesClient />
    </div>
  );
}
