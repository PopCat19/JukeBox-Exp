// input-inventory.test.ts
//
// Purpose: Unit tests for input binding inventory and concern modules
//
// This module:
// - Validates inventory structure and completeness
// - Verifies concern filter correctness
// - Ensures no duplicate binding IDs

import { describe, test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { inputBindings, InputBinding } from "../editor/input/inventory";
import {
  playbackBindings,
  navigationBindings,
  editingBindings,
  selectionBindings,
  channelsBindings,
  presetsBindings,
  viewsBindings,
  fileBindings,
  liveInputBindings,
  patternDrawBindings,
  patternSelectBindings,
  loopRegionBindings,
  trackScrollBindings,
  modRecordingBindings,
} from "../editor/input/concerns";

describe("inputBindings inventory", () => {
  test("has bindings", () => {
    expect(inputBindings.length).toBeGreaterThan(0);
  });

  test("every binding has required fields", () => {
    for (const b of inputBindings) {
      expect(typeof b.id).toBe("string");
      expect(b.id.length).toBeGreaterThan(0);
      expect(["key", "mouse", "touch", "wheel", "scroll"]).toContain(b.kind);
      expect(typeof b.sourceFile).toBe("string");
      expect(b.sourceFile.length).toBeGreaterThan(0);
      expect(typeof b.handler).toBe("string");
      expect(b.handler.length).toBeGreaterThan(0);
      expect(typeof b.concern).toBe("string");
      expect(b.concern.length).toBeGreaterThan(0);
    }
  });

  test("no duplicate ids", () => {
    const ids = inputBindings.map((b) => b.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  test("all ids are snake_case", () => {
    const snakeCase = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
    for (const b of inputBindings) {
      expect(b.id).toMatch(snakeCase);
    }
  });

  test("key bindings have a keys field", () => {
    for (const b of inputBindings) {
      if (b.kind === "key") {
        expect(b.keys != null).toBe(true);
        if (Array.isArray(b.keys)) {
          expect(b.keys.length).toBeGreaterThan(0);
        } else {
          expect(typeof b.keys).toBe("string");
          expect((b.keys as string).length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("modifiers are valid strings", () => {
    const validMods = ["ctrl", "shift", "alt", "meta"];
    for (const b of inputBindings) {
      if (b.modifiers) {
        for (const m of b.modifiers) {
          expect(validMods).toContain(m);
        }
      }
    }
  });

  test("source files exist", () => {
    const files = new Set(inputBindings.map((b) => b.sourceFile));
    for (const f of files) {
      expect(existsSync(f)).toBe(true);
    }
  });

  test("all known concerns are represented", () => {
    const concerns = new Set(inputBindings.map((b) => b.concern));
    const expected = [
      "playback", "navigation", "editing", "selection",
      "channels", "presets", "views", "file",
      "live-input", "pattern-draw", "pattern-select",
      "loop-region", "track-scroll", "mod-recording",
    ];
    for (const c of expected) {
      expect(concerns.has(c)).toBe(true);
    }
  });
});

describe("concern modules", () => {
  const concernMap: Record<string, InputBinding[]> = {
    playback: playbackBindings,
    navigation: navigationBindings,
    editing: editingBindings,
    selection: selectionBindings,
    channels: channelsBindings,
    presets: presetsBindings,
    views: viewsBindings,
    file: fileBindings,
    "live-input": liveInputBindings,
    "pattern-draw": patternDrawBindings,
    "pattern-select": patternSelectBindings,
    "loop-region": loopRegionBindings,
    "track-scroll": trackScrollBindings,
    "mod-recording": modRecordingBindings,
  };

  for (const [concern, bindings] of Object.entries(concernMap)) {
    test(`${concern} filters correctly`, () => {
      for (const b of bindings) {
        expect(b.concern).toBe(concern);
      }
    });

    test(`${concern} has at least one binding`, () => {
      expect(bindings.length).toBeGreaterThan(0);
    });
  }

  test("concern slices are exhaustive", () => {
    const allFromConcerns = Object.values(concernMap).flat();
    const allIds = new Set(inputBindings.map((b) => b.id));
    const concernIds = new Set(allFromConcerns.map((b) => b.id));
    expect(allIds.size).toBe(concernIds.size);
  });

  test("no binding appears in multiple concerns", () => {
    const allFromConcerns = Object.values(concernMap).flat();
    const ids = allFromConcerns.map((b) => b.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });
});
