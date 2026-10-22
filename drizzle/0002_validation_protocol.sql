CREATE TABLE "protocol" (
	"chatId" uuid PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"hypothesis" jsonb NOT NULL,
	"criteria" jsonb NOT NULL,
	"lockedAt" timestamp,
	"amendments" integer DEFAULT 0 NOT NULL,
	"inSampleAttempts" integer DEFAULT 0 NOT NULL,
	"oosAttempts" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" text NOT NULL,
	"stage" text NOT NULL,
	"label" text NOT NULL,
	"fileName" text,
	"trades" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protocol" ADD CONSTRAINT "protocol_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol" ADD CONSTRAINT "protocol_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_run" ADD CONSTRAINT "trade_run_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_run" ADD CONSTRAINT "trade_run_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trade_run_chat_id_idx" ON "trade_run" USING btree ("chatId");