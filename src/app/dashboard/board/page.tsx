import { BoardPageClient } from "./BoardPageClient";
import { getDashboardLocale } from "../_lib/locale";

export default async function BoardPage() {
  const locale = await getDashboardLocale();
  return <BoardPageClient locale={locale} />;
}
