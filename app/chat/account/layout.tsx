import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { AccountNav } from "@/components/AccountNav";

/** Shared shell for the account settings area (Profile, Usage, Billing). */
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
    redirect("/chat");
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-4 pt-6 sm:px-8">
        <h1 className="text-lg font-medium">Account</h1>
      </div>
      <AccountNav />
      <div className="flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
