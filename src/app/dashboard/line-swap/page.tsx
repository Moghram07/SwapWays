import { LineSwapBoardSection } from "@/components/line-swap/LineSwapBoardSection";
import { getDashboardLocale } from "../_lib/locale";

export default async function LineSwapBoardPage() {
  const locale = await getDashboardLocale();
  return <LineSwapBoardSection locale={locale} />;
}
