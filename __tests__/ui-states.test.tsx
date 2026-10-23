import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileCode } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

describe("EmptyState", () => {
  it("says what it is, why it is empty, and what to do", () => {
    render(
      <EmptyState
        icon={FileCode}
        title="No script yet"
        description="Describe the strategy and the agent writes it here."
        action={<button type="button">Start a strategy</button>}
      />,
    );

    expect(screen.getByText("No script yet")).toBeInTheDocument();
    expect(screen.getByText(/describe the strategy/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start a strategy" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("shows the real reason and a way back", async () => {
    const user = userEvent.setup({ delay: null });
    const onRetry = vi.fn();
    render(<ErrorState reason="ECONNREFUSED" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("ECONNREFUSED")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("omits the retry button when there is nothing to retry", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive technology — it is a placeholder, not content", () => {
    const { container } = render(
      <div>
        <Skeleton className="h-8 w-8" />
        <SkeletonText />
      </div>,
    );
    const nodes = container.querySelectorAll('[data-slot="skeleton"]');
    expect(nodes).toHaveLength(2);
    for (const node of nodes) expect(node).toHaveAttribute("aria-hidden", "true");
  });
});
