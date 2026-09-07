import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const layout = fs.readFileSync(
  path.resolve(__dirname, "../app/chat/layout.tsx"),
  "utf8",
);

/**
 * ConversationSidebar renders two siblings — a top bar for narrow screens
 * and the desktop rail — and both land in this container as flex children.
 * When it was a row at every width, the top bar became a full-height
 * vertical strip down the left edge of the phone (measured: 149px of a
 * 393px viewport) and squeezed the whole app into what was left.
 */
describe("chat shell layout", () => {
  it("stacks on phones and only becomes a row from md up", () => {
    expect(layout).toMatch(/flex-col overflow-hidden bg-background md:flex-row/);
  });

  it("is exactly the viewport and never scrolls the window itself", () => {
    // With min-h the shell grew with the conversation: measured at 2685px
    // tall on an 852px phone, putting the composer 1751px below the fold.
    expect(layout).toMatch(/className="flex h-dvh flex-col overflow-hidden/);
  });

  it("lets the content column shrink, so panes scroll instead of the page", () => {
    // A flex item defaults to min-height:auto and refuses to shrink below
    // its content — the single class that made the whole shell overflow.
    expect(layout).toMatch(/className="flex min-h-0 min-w-0 flex-1 flex-col"/);
  });

  it("never uses min-h-screen, which iOS Safari measures without its toolbar", () => {
    // 100vh on iOS is the height the page would have if the browser chrome
    // were hidden, so a bottom-pinned composer sits behind the toolbar.
    // Matches class attributes only — prose explaining the choice is fine.
    expect(layout).not.toMatch(/className="[^"]*min-h-screen/);
  });
});
