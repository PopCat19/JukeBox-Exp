// external-loader.test.ts
//
// Purpose: Tests for external module loading — namespace validation, registration

import { describe, test, expect } from "bun:test";
import path from "path";
import { loadExternalModule } from "../synth/socket/external-loader";
import { getInstrument, clearRegistry } from "../synth/socket/registry";
import {
	validateModuleNamespace,
	isCoreModuleId,
	isExternalModuleId,
} from "../synth/socket/registry";

const FIXTURE_PATH = path.join(import.meta.dirname, "fixtures", "community-x-wt");

// ─── namespace validation ───────────────────────────────────────────────────

describe("validateModuleNamespace", () => {
	test("accepts valid core.* ids", () => {
		expect(validateModuleNamespace("core.supersaw")).toBeNull();
		expect(validateModuleNamespace("core.pulse")).toBeNull();
		expect(validateModuleNamespace("core.fm")).toBeNull();
	});

	test("accepts valid community.* ids", () => {
		expect(validateModuleNamespace("community.x.wt")).toBeNull();
		expect(validateModuleNamespace("community.x.fm-thing")).toBeNull();
	});

	test("accepts other.* and external.* ids", () => {
		expect(validateModuleNamespace("other.test")).toBeNull();
		expect(validateModuleNamespace("external.com.example.guitar")).toBeNull();
	});

	test("rejects ids without namespace prefix", () => {
		expect(validateModuleNamespace("")).not.toBeNull();
		expect(validateModuleNamespace("nonsense")).not.toBeNull();
	});

	test("rejects ids with unknown namespace", () => {
		expect(validateModuleNamespace("unknown.bad")).not.toBeNull();
	});

	test("rejects very long ids", () => {
		const long = "core." + "a".repeat(200);
		expect(validateModuleNamespace(long)).not.toBeNull();
	});
});

// ─── namespace helpers ──────────────────────────────────────────────────────

describe("isCoreModuleId / isExternalModuleId", () => {
	test("isCoreModuleId returns true for core.*", () => {
		expect(isCoreModuleId("core.supersaw")).toBeTrue();
	});

	test("isCoreModuleId returns false for community.*", () => {
		expect(isCoreModuleId("community.x.wt")).toBeFalse();
	});

	test("isExternalModuleId returns true for community.*", () => {
		expect(isExternalModuleId("community.x.wt")).toBeTrue();
	});

	test("isExternalModuleId returns true for external.*", () => {
		expect(isExternalModuleId("external.com.example.guitar")).toBeTrue();
	});

	test("isExternalModuleId returns false for core.*", () => {
		expect(isExternalModuleId("core.supersaw")).toBeFalse();
	});
});

// ─── external module loading ────────────────────────────────────────────────

describe("loadExternalModule", () => {
	test("loads a valid community module and registers it", async () => {
		clearRegistry();
		const result = await loadExternalModule(FIXTURE_PATH, "community.x.wt");
		expect(result.success).toBe(true);
		expect(result.id).toBe("community.x.wt");

		const module = getInstrument("community.x.wt");
		expect(module).toBeDefined();
		expect(module!.id).toBe("community.x.wt");
	});

	test("rejects module id mismatch", async () => {
		clearRegistry();
		const result = await loadExternalModule(FIXTURE_PATH, "community.x.different");
		expect(result.success).toBe(false);
		expect(result.error).toContain("Expected module id");
	});

	test("rejects non-existent module path", async () => {
		const result = await loadExternalModule("/tmp/does-not-exist.mjs");
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	test("rejects module missing serialize", async () => {
		clearRegistry();
		const result = await loadExternalModule(
			path.join(import.meta.dirname, "fixtures", "community-missing-serialize"),
			"community.broken.missing-serialize",
		);
		expect(result.success).toBe(false);
		expect(result.error).toContain("missing serialize");
		// And it must NOT have been registered
		expect(getInstrument("community.broken.missing-serialize")).toBeUndefined();
	});

	test("rejects module missing deserialize", async () => {
		clearRegistry();
		const result = await loadExternalModule(
			path.join(import.meta.dirname, "fixtures", "community-missing-deserialize"),
			"community.broken.missing-deserialize",
		);
		expect(result.success).toBe(false);
		expect(result.error).toContain("missing deserialize");
		expect(getInstrument("community.broken.missing-deserialize")).toBeUndefined();
	});

	test("rejects module missing or invalid schema", async () => {
		clearRegistry();
		const result = await loadExternalModule(
			path.join(import.meta.dirname, "fixtures", "community-missing-schema"),
			"community.broken.missing-schema",
		);
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/missing or invalid schema/);
		expect(getInstrument("community.broken.missing-schema")).toBeUndefined();
	});
});
