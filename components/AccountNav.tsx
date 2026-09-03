"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, User, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCOUNT_NAV_ITEMS = [
  { href: "/chat/account", label: "Profile", icon: User },
  { href: "/chat/account/usage", label: "Usage", icon: Activity },
  { href: "/chat/account/billing", label: "Billing", icon: CreditCard },
];

/** Sub-navigation for the account settings area: Profile, Usage, Billing. */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 sm:px-8">
      {ACCOUNT_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
