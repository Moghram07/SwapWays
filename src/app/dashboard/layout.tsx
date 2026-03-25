import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { findUserById } from "@/repositories/userRepository";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }
  const user = await findUserById(session.user.id);
  return <DashboardShell isAdmin={!!user?.isAdmin}>{children}</DashboardShell>;
}
