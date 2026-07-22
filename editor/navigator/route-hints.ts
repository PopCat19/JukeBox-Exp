// Purpose: Generates deterministic fixed-width keyboard hints for Navigator routes.

const ROUTE_HINT_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const MAX_ROUTE_HINT_WIDTH = 3;

export function generateRouteHintCodes(count: number): readonly string[] {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError("Route hint count must be a non-negative integer");
	}
	if (count === 0) return [];
	let width = 1;
	while (count > ROUTE_HINT_ALPHABET.length ** width) width++;
	if (width > MAX_ROUTE_HINT_WIDTH) {
		throw new RangeError("Navigator supports at most 17576 route hints");
	}
	return Array.from({ length: count }, (_, index) => {
		let value = index;
		let code = "";
		for (let position = 0; position < width; position++) {
			code = ROUTE_HINT_ALPHABET[value % ROUTE_HINT_ALPHABET.length] + code;
			value = Math.floor(value / ROUTE_HINT_ALPHABET.length);
		}
		return code;
	});
}
