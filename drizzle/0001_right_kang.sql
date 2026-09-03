ALTER TABLE "profile" ADD COLUMN "stripeCustomerId" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "stripeSubscriptionId" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "subscriptionStatus" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_stripeCustomerId_unique" UNIQUE("stripeCustomerId");--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId");