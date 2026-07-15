// navigator-mode-coordinator.test.ts
//
// Purpose: Verifies transactional transitions among Navigator modes.

import { describe, expect, test } from "bun:test";
import type { PaneRoute } from "../editor/navigator/contracts";
import type { FileRouteId } from "../editor/navigator/file-workspace";
import type { InstrumentRouteId } from "../editor/navigator/instrument-workspace";
import type { VisualRouteId } from "../editor/navigator/visual-workspace";
import {
	NavigatorModeCoordinator,
	NavigatorTransitionError,
} from "../editor/navigator/navigator-mode-coordinator";

type FailureMode = "normal" | "file" | "instrument" | null;

function fixture(denyClose: FailureMode = null) {
	let normalOpen = false;
	let fileOpen = false;
	let instrumentOpen = false;
	let overlap = false;
	const openOutcomes: Record<Exclude<FailureMode, null>, Array<"throw" | "false">> = {
		normal: [],
		file: [],
		instrument: [],
	};
	const nextOutcome = (mode: Exclude<FailureMode, null>): "throw" | "false" | undefined =>
		openOutcomes[mode].shift();
	const checkOverlap = (): void => {
		overlap ||= Number(normalOpen) + Number(fileOpen) + Number(instrumentOpen) > 1;
	};
	const normal = {
		open: (_route: PaneRoute) => {
			const outcome = nextOutcome("normal");
			if (outcome === "throw") return Promise.reject(new Error("normal open failed"));
			if (outcome === "false") return Promise.resolve(false);
			normalOpen = true;
			checkOverlap();
			return Promise.resolve(true);
		},
		closeNavigator: () => {
			if (denyClose === "normal" && normalOpen) return Promise.resolve(false);
			normalOpen = false;
			return Promise.resolve(true);
		},
	};
	const file = {
		open: (_route: FileRouteId) => {
			const outcome = nextOutcome("file");
			if (outcome === "throw") return Promise.reject(new Error("file open failed"));
			if (outcome === "false") return Promise.resolve(false);
			fileOpen = true;
			checkOverlap();
			return Promise.resolve(true);
		},
		close: () => {
			if (denyClose === "file" && fileOpen) return Promise.resolve(false);
			fileOpen = false;
			return Promise.resolve(true);
		},
		isOpen: () => fileOpen,
	};
	const instrument = {
		open: (_route: InstrumentRouteId) => {
			const outcome = nextOutcome("instrument");
			if (outcome === "throw") return Promise.reject(new Error("instrument open failed"));
			if (outcome === "false") return Promise.resolve(false);
			instrumentOpen = true;
			checkOverlap();
			return Promise.resolve(true);
		},
		close: () => {
			if (denyClose === "instrument" && instrumentOpen) return Promise.resolve(false);
			instrumentOpen = false;
			return Promise.resolve(true);
		},
		isOpen: () => instrumentOpen,
	};
	return {
		coordinator: new NavigatorModeCoordinator(normal, file, instrument),
		failNext: (mode: Exclude<FailureMode, null>) => { openOutcomes[mode].push("throw"); },
		denyNext: (mode: Exclude<FailureMode, null>) => { openOutcomes[mode].push("false"); },
		state: () => ({ normalOpen, fileOpen, instrumentOpen, overlap }),
	};
}

const normalState = { normalOpen: true, fileOpen: false, instrumentOpen: false, overlap: false };
const fileState = { normalOpen: false, fileOpen: true, instrumentOpen: false, overlap: false };
const instrumentState = { normalOpen: false, fileOpen: false, instrumentOpen: true, overlap: false };

async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
	try {
		await promise;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("expected rejection");
}

describe("NavigatorModeCoordinator", () => {
	test("Visual denial preserves dirty source and failed destination restores Visual route", async () => {
		let normalOpen = false;
		let visualOpen = false;
		let denyVisualClose = true;
		let failNormal = false;
		const visualRoutes: VisualRouteId[] = [];
		const coordinator = new NavigatorModeCoordinator(
			{
				open: () => {
					if (failNormal) return Promise.reject(new Error("normal open failed"));
					normalOpen = true;
					return Promise.resolve(true);
				},
				closeNavigator: () => {
					normalOpen = false;
					return Promise.resolve(true);
				},
			},
			{
				open: () => Promise.resolve(true),
				close: () => Promise.resolve(true),
				isOpen: () => false,
			},
			undefined,
			{
				open: (route) => {
					visualRoutes.push(route);
					visualOpen = true;
					return Promise.resolve(true);
				},
				close: () => {
					if (denyVisualClose) return Promise.resolve(false);
					visualOpen = false;
					return Promise.resolve(true);
				},
				isOpen: () => visualOpen,
			},
		);
		await coordinator.open({ paneId: "customThemeRaw" });
		expect(await coordinator.open({ paneId: "layout" })).toBeFalse();
		expect(visualOpen).toBeTrue();
		expect(normalOpen).toBeFalse();
		denyVisualClose = false;
		failNormal = true;
		expect(await rejectionMessage(coordinator.open({ paneId: "layout" }))).toBe(
			"normal open failed",
		);
		expect(visualOpen).toBeTrue();
		expect(normalOpen).toBeFalse();
		expect(visualRoutes).toEqual(["customThemeRaw", "customThemeRaw"]);
	});

	test("serializes normal to File and File to normal route bursts", async () => {
		const f = fixture();
		await Promise.all([
			f.coordinator.open({ paneId: "layout" }),
			f.coordinator.open({ paneId: "export" }),
			f.coordinator.open({ paneId: "theme" }),
		]);
		expect(f.state()).toEqual(normalState);
	});

	test("denied source close preserves source", async () => {
		const normal = fixture("normal");
		await normal.coordinator.open({ paneId: "layout" });
		expect(await normal.coordinator.open({ paneId: "export" })).toBeFalse();
		expect(normal.state()).toEqual(normalState);

		const file = fixture("file");
		await file.coordinator.open({ paneId: "export" });
		expect(await file.coordinator.open({ paneId: "layout" })).toBeFalse();
		expect(file.state()).toEqual(fileState);
	});

	test("normal to Project failure reopens normal without overlap", async () => {
		const f = fixture();
		await f.coordinator.open({ paneId: "layout" });
		f.failNext("file");
		expect(await rejectionMessage(f.coordinator.open({ paneId: "export" }))).toBe(
			"file open failed",
		);
		expect(f.state()).toEqual(normalState);
	});

	test("Project to Instrument failure reopens Project without overlap", async () => {
		const f = fixture();
		await f.coordinator.open({ paneId: "songRecovery" });
		f.failNext("instrument");
		expect(
			await rejectionMessage(f.coordinator.open({ paneId: "importInstrument" })),
		).toBe("instrument open failed");
		expect(f.state()).toEqual(fileState);
	});

	test("Instrument to normal failure reopens Instrument without overlap", async () => {
		const f = fixture();
		await f.coordinator.open({ paneId: "exportInstrument" });
		f.failNext("normal");
		expect(await rejectionMessage(f.coordinator.open({ paneId: "theme" }))).toBe(
			"normal open failed",
		);
		expect(f.state()).toEqual(instrumentState);
	});

	test("rollback denial reports both failures and leaves accurate none mode", async () => {
		const f = fixture();
		await f.coordinator.open({ paneId: "layout" });
		f.failNext("file");
		f.denyNext("normal");
		const message = await rejectionMessage(f.coordinator.open({ paneId: "export" }));
		expect(message).toBe("Navigator destination and rollback failed");
		expect(f.state()).toEqual({
			normalOpen: false,
			fileOpen: false,
			instrumentOpen: false,
			overlap: false,
		});
	});

	test("rollback throw preserves destination provenance in transition error", async () => {
		const f = fixture();
		await f.coordinator.open({ paneId: "export" });
		f.failNext("instrument");
		f.failNext("file");
		let caught: unknown;
		try {
			await f.coordinator.open({ paneId: "importInstrument" });
		} catch (error) {
			caught = error;
		}
		expect(caught instanceof NavigatorTransitionError).toBeTrue();
		const transition = caught as NavigatorTransitionError;
		expect((transition.destinationError as Error).message).toBe("instrument open failed");
		expect((transition.rollbackError as Error).message).toBe("file open failed");
		expect(f.state()).toEqual({
			normalOpen: false,
			fileOpen: false,
			instrumentOpen: false,
			overlap: false,
		});
	});

	test("coordinates Instrument aggregate against normal and Project Data", async () => {
		const f = fixture();
		await f.coordinator.open({ paneId: "layout" });
		await f.coordinator.open({ paneId: "importInstrument" });
		expect(f.state()).toEqual(instrumentState);
		await f.coordinator.open({ paneId: "export" });
		expect(f.state()).toEqual(fileState);
	});
});
