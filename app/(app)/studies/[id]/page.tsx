import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { StudyReport } from "@/components/study/StudyReport";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { getApprovedUser } from "@/lib/gate";
import { loadStudy } from "@/lib/studies";

/**
 * One study's report. Verifies ownership before loading anything, then
 * runs the protocol analysis server-side — it is deterministic, so it is
 * recomputed on every load rather than cached.
 */
export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const gate = await getApprovedUser();
  if (gate.status === "unauthenticated") redirect("/login");
  if (gate.status === "unapproved") redirect("/studies");

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [study] = await db
    .select({ id: chats.id, title: chats.title })
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, gate.user.id)));
  if (!study) notFound();

  const { protocol, analysis, script } = await loadStudy(db, id, gate.user.id);

  return (
    <StudyReport
      chatId={id}
      title={study.title}
      study={{ protocol, analysis }}
      code={script}
    />
  );
}
