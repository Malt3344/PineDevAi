import { describe, it, expect } from "vitest";
import { groupChatsByDate } from "@/lib/chats";

// Fixed reference point so "today"/"yesterday" etc are deterministic
// regardless of when the suite runs.
const NOW = new Date("2024-06-15T12:00:00");

function chatAt(id: string, iso: string) {
  return { id, createdAt: new Date(iso) };
}

describe("groupChatsByDate", () => {
  it("puts a chat from earlier today in Today", () => {
    const groups = groupChatsByDate([chatAt("a", "2024-06-15T08:00:00")], NOW);
    expect(groups.Today.map((c) => c.id)).toEqual(["a"]);
  });

  it("puts a chat from just after midnight today in Today, not Yesterday", () => {
    const groups = groupChatsByDate([chatAt("a", "2024-06-15T00:00:01")], NOW);
    expect(groups.Today.map((c) => c.id)).toEqual(["a"]);
  });

  it("puts yesterday's chat in Yesterday", () => {
    const groups = groupChatsByDate([chatAt("a", "2024-06-14T23:00:00")], NOW);
    expect(groups.Yesterday.map((c) => c.id)).toEqual(["a"]);
  });

  it("puts a chat from 3 days ago in Last 7 days", () => {
    const groups = groupChatsByDate([chatAt("a", "2024-06-12T00:00:00")], NOW);
    expect(groups["Last 7 days"].map((c) => c.id)).toEqual(["a"]);
  });

  it("puts a chat from 20 days ago in Last 30 days", () => {
    const groups = groupChatsByDate([chatAt("a", "2024-05-26T00:00:00")], NOW);
    expect(groups["Last 30 days"].map((c) => c.id)).toEqual(["a"]);
  });

  it("puts anything older than 30 days in Older", () => {
    const groups = groupChatsByDate([chatAt("a", "2024-01-01T00:00:00")], NOW);
    expect(groups.Older.map((c) => c.id)).toEqual(["a"]);
  });

  it("splits a mixed list into the right buckets, preserving each bucket's incoming order", () => {
    const chats = [
      chatAt("today-1", "2024-06-15T09:00:00"),
      chatAt("today-2", "2024-06-15T07:00:00"),
      chatAt("yesterday-1", "2024-06-14T10:00:00"),
      chatAt("week-1", "2024-06-10T10:00:00"),
      chatAt("month-1", "2024-05-20T10:00:00"),
      chatAt("older-1", "2023-12-01T10:00:00"),
    ];

    const groups = groupChatsByDate(chats, NOW);

    expect(groups.Today.map((c) => c.id)).toEqual(["today-1", "today-2"]);
    expect(groups.Yesterday.map((c) => c.id)).toEqual(["yesterday-1"]);
    expect(groups["Last 7 days"].map((c) => c.id)).toEqual(["week-1"]);
    expect(groups["Last 30 days"].map((c) => c.id)).toEqual(["month-1"]);
    expect(groups.Older.map((c) => c.id)).toEqual(["older-1"]);
  });

  it("defaults to the real current time when none is given", () => {
    const groups = groupChatsByDate([chatAt("a", new Date().toISOString())]);
    expect(groups.Today.map((c) => c.id)).toEqual(["a"]);
  });
});
