import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const layout = fs.readFileSync(
  path.resolve(__dirname, "../app/chat/layout.tsx"),
  "utf8",
);

/**
 * The shell is shadcn's Sidebar block now. These assert the invariants that
 * were each a real bug once, and that the block's own pieces are actually
 * used rather than reimplemented beside it.
 */
describe("chat shell layout", () => {
  it("uses shadcn's sidebar provider and inset rather than hand-rolled chrome", () => {
    expect(layout).toMatch(/<SidebarProvider/);
    expect(layout).toMatch(/<SidebarInset/);
  });

  it("is exactly the viewport and never scrolls the window itself", () => {
    // With min-h the shell grew with the conversation: measured at 2685px
    // tall on an 852px phone, putting the composer 1751px below the fold.
    expect(layout).toMatch(/h-dvh/);
    expect(layout).toMatch(/overflow-hidden/);
  });

  it("never uses min-h-screen, which iOS Safari measures without its toolbar", () => {
    // 100vh on iOS is the height the page would have if the browser chrome
    // were hidden, so a bottom-pinned composer sits behind the toolbar.
    // Matches class attributes only — prose explaining the choice is fine.
    expect(layout).not.toMatch(/className="[^"]*min-h-screen/);
  });

  it("lets the content pane shrink, so panes scroll instead of the page", () => {
    // A flex item defaults to min-height:auto and refuses to shrink below
    // its content — the single class that made the whole shell overflow.
    expect(layout).toMatch(/<SidebarInset[\s\S]*?min-h-0/);
  });
});
