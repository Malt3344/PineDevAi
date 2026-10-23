import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { PLAN } from "@/lib/pricing";
import { startCheckoutAction, openBillingPortalAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  free: "Free",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
};

/**
 * Billing tab. Reads the real subscription status set by the Stripe
 * webhook and offers the matching action — subscribe, or manage/cancel
 * via the Stripe-hosted billing portal. No fake checkout: if
 * STRIPE_PRICE_ID isn't configured yet, the button is disabled and says so.
 */
export default async function BillingPage() {
  const gate = await getApprovedUser();

  if (gate.status !== "approved") {
    redirect("/login");
  }

  const status = gate.user.subscriptionStatus;
  const isPaid = status === "active" || status === "past_due";
  const billingConfigured = Boolean(process.env.STRIPE_PRICE_ID);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Subscription</CardTitle>
          <Badge variant={status === "free" ? "secondary" : "default"}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {PLAN.name} — ${PLAN.price}/month. Cancel any time.
          </p>

          {isPaid ? (
            <form action={openBillingPortalAction} className="mt-4">
              <Button type="submit" variant="outline">
                Manage subscription
              </Button>
            </form>
          ) : (
            <form action={startCheckoutAction} className="mt-4">
              <Button type="submit" disabled={!billingConfigured}>
                {billingConfigured ? "Subscribe" : "Billing not configured yet"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing history</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isPaid
              ? "View invoices and payment history in the billing portal above."
              : "No transactions yet."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
