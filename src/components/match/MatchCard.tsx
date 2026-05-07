import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/utils/dateUtils";
import { useDashboardLocale } from "@/contexts/DashboardLocaleContext";
import { getTranslator } from "@/i18n/getTranslator";

const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: "dashboard.matchStatusPending",
  ACCEPTED: "dashboard.matchStatusAccepted",
  REJECTED: "dashboard.matchStatusRejected",
  EXPIRED: "dashboard.matchStatusExpired",
};

interface MatchCardProps {
  id: string;
  matchScore: number;
  status: string;
  tradeDestination: string | null;
  tradeDepartureDate: Date;
  otherPartyName: string;
  otherPartyRank: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function MatchCard({
  id,
  matchScore,
  status,
  tradeDestination,
  tradeDepartureDate,
  otherPartyName,
  otherPartyRank,
  onAccept,
  onReject,
}: MatchCardProps) {
  const locale = useDashboardLocale();
  const t = getTranslator(locale);
  const statusKey = STATUS_LABEL_KEYS[status];
  const statusLabel = statusKey ? t(statusKey) : status;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{Math.round(matchScore)}% {t("dashboard.match")}</Badge>
          <Badge variant="secondary">{statusLabel}</Badge>
        </div>
        <p className="mt-2 font-medium">{tradeDestination ?? "—"} · {formatDisplayDate(tradeDepartureDate)}</p>
        <p className="text-sm text-slate-600">{otherPartyName} · {otherPartyRank}</p>
      </CardContent>
      {status === "PENDING" && (onAccept || onReject) && (
        <CardFooter className="gap-2">
          {onAccept && <Button size="sm" onClick={() => onAccept(id)}>Accept</Button>}
          {onReject && <Button size="sm" variant="destructive" onClick={() => onReject(id)}>Reject</Button>}
        </CardFooter>
      )}
    </Card>
  );
}
