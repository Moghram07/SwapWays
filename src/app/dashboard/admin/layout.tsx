import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/admin";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentUserAccess();
  if (!access.session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/admin");
  }
  if (!access.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <AdminNav />
      {children}
    </div>
  );
}
