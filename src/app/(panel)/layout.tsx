import { DashboardRouteGuard } from "@/components/auth/DashboardRouteGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { OverdueSessionsAlert } from "@/components/dashboard/console/OverdueSessionsAlert";
import DashboardPageClient from "@/views/dashboard/DashboardPageClient";
import { requireDashboardUser } from "@/lib/dashboard-auth";
import { fetchDashboardSessionContext } from "@/lib/server/session-context-fetch";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialUser, initialSession] = await Promise.all([
    requireDashboardUser(),
    fetchDashboardSessionContext(),
  ]);

  return (
    <DashboardShell initialUser={initialUser} initialSession={initialSession}>
      <DashboardRouteGuard>
        <DashboardPageClient initialUser={initialUser} />
        {children}
      </DashboardRouteGuard>
      <OverdueSessionsAlert />
    </DashboardShell>
  );
}
