import { describe, expect, it } from "vitest";
import { getPrestigeSuffix, getRankForLevel } from "./rankSystem";

describe("rank system", () => {
  it("maps levels 1-9 to the configured names and tiers", () => {
    expect(getRankForLevel(1)).toMatchObject({
      name: "Code Spark",
      tier: "bronze",
    });
    expect(getRankForLevel(2)).toMatchObject({
      name: "Byte Rookie",
      tier: "bronze",
    });
    expect(getRankForLevel(3)).toMatchObject({
      name: "Logic Scout",
      tier: "silver",
    });
    expect(getRankForLevel(4)).toMatchObject({
      name: "Bug Hunter",
      tier: "gold",
    });
    expect(getRankForLevel(5)).toMatchObject({
      name: "Loop Runner",
      tier: "platinum",
    });
    expect(getRankForLevel(6)).toMatchObject({
      name: "Data Diver",
      tier: "platinum",
    });
    expect(getRankForLevel(7)).toMatchObject({
      name: "Algorithm Apprentice",
      tier: "platinum",
    });
    expect(getRankForLevel(8)).toMatchObject({
      name: "Debug Master",
      tier: "prestige",
    });
    expect(getRankForLevel(9)).toMatchObject({
      name: "Cyber Sentinel",
      tier: "prestige",
    });
  });

  it("uses prestige suffixes above level 9", () => {
    expect(getRankForLevel(10)).toMatchObject({
      name: "Cyber Sentinel Prestige I",
      tier: "prestige",
      prestigeSuffix: "I",
    });
    expect(getRankForLevel(11)).toMatchObject({
      name: "Cyber Sentinel Prestige II",
      tier: "prestige",
      prestigeSuffix: "II",
    });
    expect(getPrestigeSuffix(14)).toBe("V");
  });

  it("resolves levels below 1 to the first rank", () => {
    expect(getRankForLevel(0)).toMatchObject({
      level: 1,
      name: "Code Spark",
      tier: "bronze",
    });
    expect(getRankForLevel(Number.NaN)).toMatchObject({
      level: 1,
      name: "Code Spark",
    });
  });
});
