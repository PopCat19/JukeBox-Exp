// navigator-mode-coordinator.test.ts
//
// Purpose: Verifies serialized transitions between normal and File navigator modes.

import { describe, expect, test } from "bun:test";
import type { PaneRoute } from "../editor/navigator/contracts";
import type { FileRouteId } from "../editor/navigator/file-workspace";
import { NavigatorModeCoordinator } from "../editor/navigator/navigator-mode-coordinator";

function fixture(denyNormalClose = false, denyFileClose = false) {
	let normalOpen = false;
	let fileOpen = false;
	let overlap = false;
	const normal = {
		open: async (_route: PaneRoute) => {
			normalOpen = true;
			overlap ||= fileOpen;
		},
		closeNavigator: async () => {
			if (denyNormalClose && normalOpen) return false;
			normalOpen = false;
			return true;
		},
	};
	const file = {
		open: async (_route: FileRouteId) => {
			fileOpen = true;
			overlap ||= normalOpen;
			return true;
		},
		close: async () => {
			if (denyFileClose && fileOpen) return false;
			fileOpen = false;
			return true;
		},
		isOpen: () => fileOpen,
	};
	return {
		coordinator: new NavigatorModeCoordinator(normal, file),
		state: () => ({ normalOpen, fileOpen, overlap }),
	};
}

describe("NavigatorModeCoordinator", () => {
	test("serializes normal to File and File to normal route bursts", async () => {
		const f = fixture();
		await Promise.all([
			f.coordinator.open({ paneId: "layout" }),
			f.coordinator.open({ paneId: "export" }),
			f.coordinator.open({ paneId: "theme" }),
		]);
		expect(f.state()).toEqual({ normalOpen: true, fileOpen: false, overlap: false });
	});

	test("denied normal close prevents File opening", async () => {
		const f = fixture(true);
		await f.coordinator.open({ paneId: "layout" });
		expect(await f.coordinator.open({ paneId: "export" })).toBeFalse();
		expect(f.state()).toEqual({ normalOpen: true, fileOpen: false, overlap: false });
	});

	test("denied File close prevents normal opening", async () => {
		const f = fixture(false, true);
		await f.coordinator.open({ paneId: "export" });
		expect(await f.coordinator.open({ paneId: "layout" })).toBeFalse();
		expect(f.state()).toEqual({ normalOpen: false, fileOpen: true, overlap: false });
	});

	test("queued close then open has deterministic final mode", async () => {
		const f = fixture();
		await f.coordinator.open({ paneId: "export" });
		await Promise.all([f.coordinator.close(), f.coordinator.open({ paneId: "layout" })]);
		expect(f.state()).toEqual({ normalOpen: true, fileOpen: false, overlap: false });
	});
});
