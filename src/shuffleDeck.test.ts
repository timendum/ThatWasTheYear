/// <reference lib="deno.ns" />

import { describe, it as test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { shuffleDeck } from "./shuffleDeck.ts";
import type { Song } from "./types.ts";

describe("shuffleDeck era balance", () => {
  test("first 50 draws (5 players x 10) are evenly spread across years", async () => {
    const songs: Song[] = (
      await import("../assets/songs.json", {
        with: { type: "json" },
      })
    ).default;

    const players = 5;
    const endValue = 10; // first to reach 10 songs

    // Try a few attempts to reduce flakiness from randomness; pass if any attempt meets criteria
    let passed = false;
    const attempts = 3;

    for (let attempt = 0; attempt < attempts && !passed; attempt++) {
      const decks = shuffleDeck(songs, players, endValue);

      // Ensure we have enough cards for 10 draws each
      expect(
        decks.every((d) => d.length > endValue),
        "every player have enought cards",
      ).toBe(true);
      const minSongs = Math.floor((songs.length * 0.8) / players);
      expect(
        decks.every((d) => d.length > minSongs),
        "every player have same amount of cards",
      ).toBe(true);

      // For each player, take their first 10 songs and compute average year and span
      const playerAverages = decks.map((d) => {
        const slice = d.slice(0, endValue);
        const years = slice.map((s) => s.y);
        const avg = years.reduce((s, v) => s + v, 0) / years.length;
        const span = Math.max(...years) - Math.min(...years);
        return { avg, span };
      });

      const overallAvg = playerAverages.reduce((s, p) => s + p.avg, 0) / playerAverages.length;

      // Check averages are within 5 years of overall average and each player's span >= 15 years
      const avgOk = playerAverages.every((p) => Math.abs(p.avg - overallAvg) <= 5);
      const spanOk = playerAverages.every((p) => p.span >= 20);

      if (avgOk && spanOk) passed = true;
    }

    expect(passed).toEqual(true);
  });
});
