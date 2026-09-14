import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SessionTimeoutWatcher } from "@/components/auth/SessionTimeoutWatcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="dashboard-layout">
      <Sidebar user={session.user} />
      <main className="main-content">
        {children}
      </main>
      <SessionTimeoutWatcher />
    </div>
  );
}
