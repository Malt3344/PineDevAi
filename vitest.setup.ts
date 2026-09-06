import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement these, but Base UI's popup positioning (menus,
// dropdowns, tooltips, the mobile sheet) depends on them. Without a
// polyfill, opening one of those in a test still eventually works — it
// falls back to a slow retry path — but takes ~25+ real seconds per
// interaction instead of being instant. This is the standard fix
// recommended for testing Radix/Base UI-family components under jsdom.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver ?? (ResizeObserverMock as unknown as typeof ResizeObserver);

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
global.IntersectionObserver =
  global.IntersectionObserver ?? (IntersectionObserverMock as unknown as typeof IntersectionObserver);

if (typeof window !== "undefined") {
  window.requestAnimationFrame =
    window.requestAnimationFrame ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0));
  window.cancelAnimationFrame = window.cancelAnimationFrame ?? ((id: number) => clearTimeout(id));
}

// jsdom has no real layout engine — every element's bounding rect is all
// zeros. Base UI's Floating-UI-based positioner treats that as "not
// placed yet" and retries, which is what actually caused the ~25s hang
// per interaction (not a timer — a real wait for a size that never
// arrives). A fixed, non-zero rect is enough for it to place popups
// immediately instead of retrying.
Element.prototype.getBoundingClientRect = () => ({
  width: 100,
  height: 40,
  top: 0,
  left: 0,
  right: 100,
  bottom: 40,
  x: 0,
  y: 0,
  toJSON() {
    return this;
  },
});

// Base UI (like Radix) checks for the Web Animations API on scrollable
// viewports; jsdom doesn't implement it.
Element.prototype.getAnimations = Element.prototype.getAnimations ?? (() => []);
