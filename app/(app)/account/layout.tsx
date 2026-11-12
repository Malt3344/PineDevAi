import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";

/** Shared shell for the account settings page. */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await getApprovedUser();

  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  if (gate.status === "unapproved") {
    redirect("/studies");
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-4 py-6 sm:px-8">
        <h1 className="text-lg font-medium">Account</h1>
      </div>
      <div className="flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
