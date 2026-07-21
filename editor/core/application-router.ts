// Purpose: Routes global prompt actions and navigator commands through one application boundary.

import { getPromptCommand } from "../navigator/command-registry";
import {
	isSerializableValue,
	type NavigatorCommandReference,
	type PaneRoute,
	type SerializableValue,
} from "../navigator/contracts";
import { canonicalRouteIdentity } from "../navigator/route-identity";

export interface GlobalApplicationRoute {
	readonly presentation: "global";
	readonly scope: string;
	readonly context?: SerializableValue;
}

export type ApplicationRoute = GlobalApplicationRoute | NavigatorCommandReference;

export interface NavigatorRouteTarget {
	open(route: PaneRoute): Promise<boolean>;
	onOpened?(route: PaneRoute): void;
	focus(): void;
}

export interface ApplicationRouterTargets {
	openGlobal(route: GlobalApplicationRoute): void;
	readonly navigator?: NavigatorRouteTarget;
}

function snapshotValue(value: SerializableValue): SerializableValue {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) return Object.freeze(value.map(snapshotValue));
	const source = value as { readonly [key: string]: SerializableValue };
	const snapshot: Record<string, SerializableValue> = {};
	for (const key of Object.keys(source)) {
		Object.defineProperty(snapshot, key, {
			value: snapshotValue(source[key]),
			enumerable: true,
		});
	}
	return Object.freeze(snapshot);
}

function snapshotPaneRoute(route: PaneRoute): PaneRoute {
	canonicalRouteIdentity(route);
	const context = route.context;
	return Object.freeze({
		paneId: route.paneId,
		...(context === undefined ? {} : { context: snapshotValue(context) }),
		...(route.category === undefined ? {} : { category: route.category }),
	});
}

function snapshotGlobalRoute(route: GlobalApplicationRoute): GlobalApplicationRoute {
	if (typeof route.scope !== "string" || route.scope.length === 0) {
		throw new TypeError("global route scope must be a non-empty string");
	}
	const context = route.context;
	if (context !== undefined && !isSerializableValue(context)) {
		throw new TypeError("global route context must contain JSON values");
	}
	return Object.freeze({
		presentation: "global" as const,
		scope: route.scope,
		...(context === undefined ? {} : { context: snapshotValue(context) }),
	});
}

export class ApplicationRouter {
	constructor(private readonly targets: ApplicationRouterTargets) {}

	routePrompt(scope: string, context?: SerializableValue): Promise<void> {
		const command = getPromptCommand(scope);
		const isTipScope = command === undefined && scope !== "tipPromptScope";
		const paneId = isTipScope ? "tipPromptScope" : scope;
		const routeContext = isTipScope
			? { tipName: scope, ...(context === undefined ? {} : { source: context }) }
			: context;
		return this.route({
			presentation: "navigator",
			commandId: command?.id ?? "legacy-prompt",
			route: { paneId, ...(routeContext === undefined ? {} : { context: routeContext }) },
		});
	}

	async route(route: ApplicationRoute): Promise<void> {
		if (route.presentation === "global") {
			this.targets.openGlobal(snapshotGlobalRoute(route));
			return;
		}
		if (typeof route.commandId !== "string" || route.commandId.length === 0) {
			throw new TypeError("navigator commandId must be a non-empty string");
		}
		const navigator = this.targets.navigator;
		if (navigator === undefined) throw new Error("navigator routing is not configured");
		const paneRoute = snapshotPaneRoute(route.route);
		if (await navigator.open(paneRoute)) {
			navigator.onOpened?.(paneRoute);
			navigator.focus();
		}
	}
}
