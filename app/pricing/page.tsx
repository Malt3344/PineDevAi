import { Check, Clock } from "lucide-react";
import { startCheckoutAction } from "@/app/chat/account/billing/actions";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { PLANS, FAQ } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const [standardPlan, proPlan] = PLANS;

/** Public pricing page. The $39 plan is live and matches the real, running Stripe plan; the $139 plan is not built yet, and is marked as such. */
export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Simple pricing
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            The whole validation protocol on one plan. Portfolio-level research is next.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                {standardPlan.name}
              </CardTitle>
              <p className="text-3xl font-semibold">
                ${standardPlan.price}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5 text-sm">
                {standardPlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <form action={startCheckoutAction}>
                <Button type="submit" className="w-full">
                  Get started
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base font-medium text-muted-foreground">
                {proPlan.name}
              </CardTitle>
              <Badge variant="secondary">
                <Clock className="size-3" />
                Coming soon
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold text-muted-foreground">
                ${proPlan.price}
                <span className="text-sm font-normal">/mo</span>
              </p>
              <ul className="space-y-2.5 text-sm">
                {proPlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Not available yet — we&apos;re building it in production. Join the
                  waitlist and we&apos;ll email you when it&apos;s ready. Access is limited
                  even once it launches.
                </p>
                <WaitlistForm />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto mt-24 max-w-2xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Questions
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
