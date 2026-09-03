import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { listStrategies } from "@/lib/strategies";
import { db } from "@/lib/db/client";
import { StrategyList } from "@/components/StrategyList";

/** Lists the current user's saved Pine Script strategies. */
export default async function StrategiesPage() {
  const gate = await getApprovedUser();

  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  if (gate.status === "unapproved") {
    redirect("/chat");
  }

  const strategies = await listStrategies(db, gate.user.id);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-lg font-medium">Saved strategies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scripts you saved from the chat, in one place.
        </p>
        <div className="mt-6">
          <StrategyList
            strategies={strategies.map((s) => ({
              id: s.id,
              title: s.title,
              code: s.code,
              createdAt: s.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
