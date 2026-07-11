// Purpose: Produces canonical navigator route identities from finite JSON values.

import type { PaneRoute, SerializableValue } from "./contracts";

export type PaneIdentity = string;

function compareUtf16(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function normalize(value: unknown, ancestors: Set<object>): SerializableValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new TypeError("route context numbers must be finite");
		return Object.is(value, -0) ? 0 : value;
	}
	if (typeof value !== "object") throw new TypeError("route context must contain JSON values");
	if (ancestors.has(value)) throw new TypeError("route context must not contain cycles");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			const result: SerializableValue[] = [];
			for (let index = 0; index < value.length; index++) {
				if (!Object.hasOwn(value, index))
					throw new TypeError("route context arrays must not contain holes");
				result.push(normalize(value[index], ancestors));
			}
			return result;
		}
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) {
			throw new TypeError("route context objects must be plain objects");
		}
		const result = Object.create(null) as Record<string, SerializableValue>;
		for (const key of Object.keys(value).sort(compareUtf16)) {
			Object.defineProperty(result, key, {
				value: normalize((value as Record<string, unknown>)[key], ancestors),
				enumerable: true,
				configurable: true,
				writable: true,
			});
		}
		return result;
	} finally {
		ancestors.delete(value);
	}
}

export function canonicalRouteIdentity(route: PaneRoute): PaneIdentity {
	if (typeof route.paneId !== "string" || route.paneId.length === 0)
		throw new TypeError("paneId must be a non-empty string");
	const context = Object.hasOwn(route, "context") ? normalize(route.context, new Set()) : null;
	return JSON.stringify([route.paneId, context]);
}
