import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { getUsageSummary } from "@/lib/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

/** Usage tab: real, live counts against the daily message cap and account totals. */
export default async function UsagePage() {
  const gate = await getApprovedUser();

  if (gate.status !== "approved") {
    redirect("/login");
  }

  const usage = await getUsageSummary(db, gate.user.id, gate.user.subscriptionStatus);
  const percentUsedToday = Math.min(
    100,
    Math.round((usage.messagesToday / usage.dailyMessageCap) * 100),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              {usage.messagesToday} of {usage.dailyMessageCap} used
            </span>
            <span className="tabular-nums text-muted-foreground">{percentUsedToday}%</span>
          </div>
          <Progress value={percentUsedToday} />
          <p className="mt-3 text-sm text-muted-foreground">
            Resets daily at midnight UTC. Only messages you send count — assistant
            replies don&apos;t.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Conversations" value={usage.totalConversations} />
        <StatCard label="Messages sent" value={usage.totalMessagesSent} />
        <StatCard label="Saved strategies" value={usage.totalStrategiesSaved} />
      </div>
    </div>
  );
}
