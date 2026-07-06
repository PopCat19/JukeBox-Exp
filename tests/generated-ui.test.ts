// generated-ui.test.ts
//
// Purpose: Contract tests for editor/generated-ui/ factories
//
// This module:
// - Verifies buildModulePanel creates correct controls from schema
// - Verifies ChangeSetParam shapes match existing change patterns
// - Verifies the supersaw schema maps to correct param keys

import { describe, test, expect, beforeAll } from "bun:test";

// Register happy-dom for DOM APIs used by imperative-html and panel factory
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

// Dynamic imports to ensure DOM is available before module evaluation
let buildModulePanel: any;
let ChangeSetParam: any;
let supersawSchema: any;

beforeAll(async () => {
	const panelMod = await import("../editor/generated-ui/panel-factory");
	const changeMod = await import("../editor/generated-ui/change-factory");
	const schemaMod = await import("../synth/modules/supersaw/schema");
	buildModulePanel = panelMod.buildModulePanel;
	ChangeSetParam = changeMod.ChangeSetParam;
	supersawSchema = schemaMod.schema;
});

// ─── panel factory ───────────────────────────────────────────────────────────

describe("buildModulePanel from supersaw schema", () => {
	const doc = {} as any;
	const onOpenPrompt = (_key: string) => {};

	test("creates container element", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		expect(panel.container).toBeDefined();
		expect(panel.container.tagName).toBe("DIV");
	});

	test("creates rows for all 5 params", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		expect(Object.keys(panel.rows).length).toBe(5);
	});

	test("includes supersawDynamism row", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		expect(panel.rows.supersawDynamism).toBeDefined();
	});

	test("includes supersawSpread row", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		expect(panel.rows.supersawSpread).toBeDefined();
	});

	test("includes supersawShape row", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		expect(panel.rows.supersawShape).toBeDefined();
	});

	test("includes pulseWidth row", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		expect(panel.rows.pulseWidth).toBeDefined();
	});

	test("includes decimalOffset row", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		expect(panel.rows.decimalOffset).toBeDefined();
	});

	test("each row has a slider", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		for (const [_key, entry] of Object.entries(panel.rows)) {
			const e = entry as { row: HTMLDivElement; slider: any };
			expect(e.slider).toBeDefined();
			expect(typeof e.slider.updateValue).toBe("function");
		}
	});

	test("destroy removes container", () => {
		const panel = buildModulePanel({ doc, schema: supersawSchema, onOpenPrompt });
		document.body.appendChild(panel.container);
		expect(document.body.contains(panel.container)).toBeTrue();
		panel.destroy();
		expect(document.body.contains(panel.container)).toBeFalse();
	});
});

// ─── panel factory with override ─────────────────────────────────────────────

describe("buildModulePanel with param override", () => {
	const doc = {} as any;

	test("override replaces specific param row", () => {
		const panel = buildModulePanel({
			doc,
			schema: supersawSchema,
			onOpenPrompt: () => {},
			overrideParam: (key: string) =>
				key === "supersawDynamism" ? { row: document.createElement("div") } : null,
		});
		// Override replaces the row — container has section headers + 5 param rows
		expect(panel.container.childNodes.length).toBe(7);
	});
});

// ─── ChangeSetParam ──────────────────────────────────────────────────────────

describe("ChangeSetParam", () => {
	test("constructor does not throw", () => {
		const doc = {
			getCurrentInstrument: () => ({}),
			synth: { unsetMod: () => {} },
			notifier: { changed: () => {} },
		} as any;

		const change = new ChangeSetParam(doc, "testKey", 0, 5);
		expect(change).toBeDefined();
	});

	test("accepts optional modKey", () => {
		const doc = {
			getCurrentInstrument: () => ({}),
			synth: { unsetMod: () => {} },
			notifier: { changed: () => {} },
		} as any;

		const change = new ChangeSetParam(doc, "testKey", 0, 5, 42);
		expect(change).toBeDefined();
	});
});

// ─── schema <-> panel key alignment ──────────────────────────────────────────

describe("schema key alignment", () => {
	test("all schema param keys have corresponding generated row keys", () => {
		const panel = buildModulePanel({
			doc: {} as any,
			schema: supersawSchema,
			onOpenPrompt: () => {},
		});
		for (const param of supersawSchema.params) {
			expect(panel.rows[param.key]).toBeDefined();
		}
	});
});
