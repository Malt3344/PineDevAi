import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { LandingDemo } from "@/components/LandingDemo";

/**
 * The demo starts when it scrolls into view. vitest.setup.ts installs an
 * inert IntersectionObserver (it never calls back), which would leave the
 * demo permanently at its idle frame here — so these tests install one that
 * reports the element as visible the moment it is observed.
 */
function stubIntersectionObserver(intersecting: boolean) {
  class ImmediateIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [
          {
            target,
            isIntersecting: intersecting,
            intersectionRatio: intersecting ? 1 : 0,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);
}

/** jsdom has no matchMedia at all, so the component's guard needs a real one. */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

// Comfortably longer than the whole scripted timeline (~13.5s).
const FULL_TIMELINE_MS = 25_000;

const PROMPT = "Build me an ORB breakout strategy for NQ with a fixed 1:2 risk-reward";

/** The last line of the generated script — only present once the fill completes. */
const LAST_CODE_LINE = /strategy\.close_all\(comment = "EOD flat"\)/;

beforeEach(() => {
  stubIntersectionObserver(true);
  stubReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LandingDemo", () => {
  it("renders all three panels' chrome, with the editor and chat empty before the sequence starts", () => {
    vi.useFakeTimers();
    render(<LandingDemo />);

    // Workspace panel.
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("this conversation.pine")).toBeInTheDocument();

    // Editor panel — no file yet, and a Run button that is disabled here for
    // the same reason it is disabled in the real StrategyEditorPanel.
    expect(screen.getByText("No file open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run/i })).toBeDisabled();
    expect(
      screen.getByText("The Pine Script PineDev writes for you will appear here."),
    ).toBeInTheDocument();

    // Chat panel — title bar and an empty composer.
    expect(screen.getByText("NQ ORB breakout")).toBeInTheDocument();
    expect(
      screen.getByText("Describe a strategy, or paste a compiler error…"),
    ).toBeInTheDocument();

    // Nothing from the run has happened yet.
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    expect(screen.queryByText("nq_orb_breakout.pine")).not.toBeInTheDocument();
  });

  it("plays the whole sequence and settles on the populated final state", () => {
    vi.useFakeTimers();
    const { container } = render(<LandingDemo />);

    act(() => {
      vi.advanceTimersByTime(FULL_TIMELINE_MS);
    });

    // The prompt was sent and is in the thread; the composer is empty again.
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(
      screen.getByText("Describe a strategy, or paste a compiler error…"),
    ).toBeInTheDocument();

    // Both narrated assistant lines, the rule-check card, and its result.
    expect(screen.getByText(/writing it as a Pine v6 strategy/)).toBeInTheDocument();
    expect(screen.getByText(/v6 rules I hold every script to/)).toBeInTheDocument();
    expect(screen.getByText("Pine v6 rule check")).toBeInTheDocument();
    expect(screen.getByText(/nothing can repaint/)).toBeInTheDocument();

    // The file-creation event: a tab in the editor and an entry in the workspace.
    expect(screen.getAllByText("nq_orb_breakout.pine").length).toBeGreaterThan(0);

    // The editor filled all the way to the script's last line.
    expect(container.textContent).toMatch(LAST_CODE_LINE);

    // The review beat resolved in both panels.
    expect(screen.getByText("v6 syntax OK")).toBeInTheDocument();
    expect(screen.getByText(/Reviewed against Pine v6 — no syntax errors/)).toBeInTheDocument();

    // Settled: nothing is left scheduled, so it cannot restart on its own.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("skips straight to the final state when prefers-reduced-motion is set", () => {
    stubReducedMotion(true);
    vi.useFakeTimers();
    const { container } = render(<LandingDemo />);

    // No timers advanced at all — the populated end state is already there.
    expect(container.textContent).toMatch(LAST_CODE_LINE);
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(screen.getByText("v6 syntax OK")).toBeInTheDocument();
    expect(screen.getByText(/Reviewed against Pine v6 — no syntax errors/)).toBeInTheDocument();

    // And nothing was scheduled, so no animation runs afterwards either.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not start while it is out of view", () => {
    stubIntersectionObserver(false);
    vi.useFakeTimers();
    render(<LandingDemo />);

    act(() => {
      vi.advanceTimersByTime(FULL_TIMELINE_MS);
    });

    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    expect(screen.getByText("No file open")).toBeInTheDocument();
  });
});
