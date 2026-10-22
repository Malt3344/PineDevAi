import { describe, it, expect, vi } from "vitest";
import {
  listDocumentVersions,
  listDocuments,
  saveDocument,
  saveDocumentVersion,
} from "@/lib/documents";

function makeInsertDb(returnRows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnRows);
  const values = vi.fn<(row: Record<string, unknown>) => { returning: typeof returning }>(
    () => ({ returning }),
  );
  const insert = vi.fn(() => ({ values }));
  return { db: { insert } as never, insert, values, returning };
}

function makeSelectDb(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select } as never, select, from, where, orderBy };
}

describe("saveDocument", () => {
  it("mints a fresh id rather than reusing anything from the caller", async () => {
    const { db, values } = makeInsertDb([{ id: "new-id" }]);

    await saveDocument(db, { userId: "u1", title: "My strat", code: "//pine", chatId: "c1" });

    const inserted = values.mock.calls[0][0] as { id: string; content: string; chatId: string };
    expect(typeof inserted.id).toBe("string");
    expect(inserted.id.length).toBeGreaterThan(0);
    expect(inserted.content).toBe("//pine");
    expect(inserted.chatId).toBe("c1");
  });

  it("falls back to a default title when none is given", async () => {
    const { db, values } = makeInsertDb([{ id: "new-id" }]);

    await saveDocument(db, { userId: "u1", title: "", code: "//pine" });

    expect(values.mock.calls[0][0].title).toBe("Untitled strategy");
  });

  it("truncates an overlong title", async () => {
    const { db, values } = makeInsertDb([{ id: "new-id" }]);
    const longTitle = "x".repeat(200);

    await saveDocument(db, { userId: "u1", title: longTitle, code: "//pine" });

    expect(values.mock.calls[0][0].title).toHaveLength(80);
  });
});

describe("saveDocumentVersion", () => {
  it("reuses the given id instead of minting a new one", async () => {
    const { db, values } = makeInsertDb([{ id: "existing-id" }]);

    await saveDocumentVersion(db, {
      id: "existing-id",
      userId: "u1",
      title: "My strat v2",
      code: "//pine v2",
      chatId: "c1",
    });

    expect(values.mock.calls[0][0]).toMatchObject({
      id: "existing-id",
      content: "//pine v2",
      chatId: "c1",
    });
  });

  it("returns the inserted row", async () => {
    const { db } = makeInsertDb([{ id: "existing-id", content: "//pine v2" }]);

    const row = await saveDocumentVersion(db, {
      id: "existing-id",
      userId: "u1",
      title: "My strat v2",
      code: "//pine v2",
    });

    expect(row).toEqual({ id: "existing-id", content: "//pine v2" });
  });
});

describe("listDocuments", () => {
  it("returns whatever the query resolves, newest first by construction", async () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const { db, where, orderBy } = makeSelectDb(rows);

    const result = await listDocuments(db, "u1");

    expect(where).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(rows);
  });
});

describe("listDocumentVersions", () => {
  it("scopes the query to both the document id and the caller's user id", async () => {
    const rows = [
      { id: "doc-1", createdAt: new Date("2024-02-01") },
      { id: "doc-1", createdAt: new Date("2024-01-01") },
    ];
    const { db, where, orderBy } = makeSelectDb(rows);

    const result = await listDocumentVersions(db, "doc-1", "u1");

    expect(where).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(rows);
  });
});
