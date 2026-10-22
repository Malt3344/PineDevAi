"use client";

import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AGENT_MODELS, type ModelTier } from "@/lib/agent/models";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<ModelTier, string> = {
  economy: "Free models",
  premium: "Premium models",
};

// Rendered in this order regardless of how AGENT_MODELS happens to be
// sorted, so a future "premium" entry lands in its own labeled group
// without any further changes here.
const TIER_ORDER: ModelTier[] = ["premium", "economy"];

/**
 * The model picker used in the chat header. Grouped by tier defensively —
 * every model today is "economy", but this is ready for a "premium" tier
 * to show up alongside it without more work.
 */
export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (modelId: string) => void;
}) {
  const activeModel = AGENT_MODELS.find((m) => m.id === value);

  const groups = TIER_ORDER.map((tier) => ({
    tier,
    models: AGENT_MODELS.filter((m) => m.tier === tier),
  })).filter((group) => group.models.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Model"
          className="h-7 min-w-0 gap-1 text-xs text-muted-foreground"
        >
          <span className="truncate">{activeModel?.label ?? value}</span>
          <ChevronDown className="size-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {groups.map((group, i) => (
          <div key={group.tier}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{TIER_LABEL[group.tier]}</DropdownMenuLabel>
            {group.models.map((model) => (
              <DropdownMenuItem key={model.id} onClick={() => onChange(model.id)}>
                <Check
                  className={cn("size-3.5", model.id === value ? "opacity-100" : "opacity-0")}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5">
                    {model.label}
                    {model.tier === "economy" && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[0.65rem]">
                        Free
                      </Badge>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {model.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
