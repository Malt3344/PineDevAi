import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { listDocuments } from "@/lib/documents";
import { db } from "@/lib/db/client";
import { StrategyList } from "@/components/StrategyList";

/** Lists the current user's saved Pine Script strategies — the scripts behind their studies. */
export default async function StrategiesPage() {
  const gate = await getApprovedUser();

  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  if (gate.status === "unapproved") {
    redirect("/chat");
  }

  const documents = await listDocuments(db, gate.user.id);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-lg font-medium">Script library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every script you saved from a study, with its version history.
        </p>
        <div className="mt-6">
          <StrategyList
            strategies={documents.map((d) => ({
              id: d.id,
              title: d.title,
              code: d.content,
              createdAt: d.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
