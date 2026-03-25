import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/admin";
import { AdminPageClient } from "./AdminPageClient";

export default async function AdminPage() {
  const access = await getCurrentUserAccess();
  if (!access.session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/admin");
  }
  if (!access.isAdmin) {
    redirect("/dashboard");
  }
  return <AdminPageClient />;
}
