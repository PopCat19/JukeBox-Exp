// input-wheel-support.test.ts
//
// Purpose: Verifies numeric wheel stepping only consumes effective value changes.
//
// This module:
// - Covers preference, delta, value, bounds, registration, and event dispatch contracts

import { afterEach, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { addWheelSupport } from "../editor/ui/base/input";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

function wheel(deltaY: number): WheelEvent {
	return new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY });
}

function numberInput(value = "5"): HTMLInputElement {
	const input = document.createElement("input");
	input.type = "number";
	input.min = "0";
	input.max = "10";
	input.step = "2";
	input.value = value;
	return input;
}

afterEach(() => {
	localStorage.removeItem("enableScrollStep");
	document.body.replaceChildren();
});

describe("addWheelSupport", () => {
	// happy-dom exposes cancellation state, but cannot prove browser scrolling behavior.
	test("registers a non-passive wheel listener", () => {
		const input = numberInput();
		const nativeAdd = input.addEventListener.bind(input);
		let wheelOptions: AddEventListenerOptions | boolean | undefined;
		input.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
			if (type === "wheel") wheelOptions = options;
			nativeAdd(type, listener, options);
		}) as typeof input.addEventListener;

		addWheelSupport(input);

		expect(wheelOptions).toEqual({ passive: false });
	});

	test("enabled stepping changes once and cancels the wheel default", () => {
		localStorage.setItem("enableScrollStep", "true");
		const input = numberInput();
		document.body.append(input);
		addWheelSupport(input);
		let inputEvents = 0;
		let changeEvents = 0;
		let bubbledWheels = 0;
		document.body.addEventListener("input", () => inputEvents++, { once: true });
		document.body.addEventListener("change", () => changeEvents++, { once: true });
		document.body.addEventListener("wheel", () => bubbledWheels++, { once: true });
		const event = wheel(-1);

		input.dispatchEvent(event);

		expect(input.value).toBe("7");
		expect(inputEvents).toBe(1);
		expect(changeEvents).toBe(1);
		expect(bubbledWheels).toBe(1);
		expect(event.defaultPrevented).toBeTrue();
	});

	test("disabled preference leaves value unchanged without cancelling the wheel default", () => {
		const input = numberInput();
		addWheelSupport(input);
		const event = wheel(-1);

		input.dispatchEvent(event);

		expect(input.value).toBe("5");
		expect(event.defaultPrevented).toBeFalse();
	});

	test("bounds dispatch nothing without cancelling the wheel default", () => {
		localStorage.setItem("enableScrollStep", "true");
		const input = numberInput("10");
		addWheelSupport(input);
		let events = 0;
		input.addEventListener("input", () => events++);
		input.addEventListener("change", () => events++);
		const event = wheel(-1);

		input.dispatchEvent(event);

		expect(input.value).toBe("10");
		expect(events).toBe(0);
		expect(event.defaultPrevented).toBeFalse();

		input.value = "0";
		const lowerEvent = wheel(1);
		input.dispatchEvent(lowerEvent);
		expect(input.value).toBe("0");
		expect(events).toBe(0);
		expect(lowerEvent.defaultPrevented).toBeFalse();
	});

	test("invalid values and zero or nonfinite deltas do nothing", () => {
		localStorage.setItem("enableScrollStep", "true");
		const input = numberInput();
		addWheelSupport(input);
		const zero = wheel(0);
		const infinite = wheel(Number.POSITIVE_INFINITY);
		input.dispatchEvent(zero);
		input.dispatchEvent(infinite);
		input.value = "";
		const invalid = wheel(-1);
		input.dispatchEvent(invalid);

		expect(input.value).toBe("");
		expect(zero.defaultPrevented).toBeFalse();
		expect(infinite.defaultPrevented).toBeFalse();
		expect(invalid.defaultPrevented).toBeFalse();
	});
});
