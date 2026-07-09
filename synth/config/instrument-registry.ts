// instrument-registry.ts
//
// Purpose: Dynamic instrument type registration replacing the old const enum
//
// This module:
// - Maintains a name→id mapping for extensible instrument types
// - Exports the InstrumentType object with built-in type IDs
// - Provides helper functions for type name/id conversion

/*!
Copyright (c) 2012-2022 John Nesky and contributing authors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const _instrumentTypeMap: Map<string, number> = new Map();
const _instrumentTypeNames: string[] = [];
let _nextInstrumentTypeId = 0;

function _registerBuiltInType(name: string): number {
	const id = _nextInstrumentTypeId++;
	_instrumentTypeMap.set(name, id);
	_instrumentTypeNames[id] = name;
	return id;
}

// Order MUST match the old enum numeric values
export const InstrumentType = {
	chip: _registerBuiltInType("chip"), // 0
	fm: _registerBuiltInType("fm"), // 1
	noise: _registerBuiltInType("noise"), // 2
	spectrum: _registerBuiltInType("spectrum"), // 3
	drumset: _registerBuiltInType("drumset"), // 4
	harmonics: _registerBuiltInType("harmonics"), // 5
	pwm: _registerBuiltInType("pwm"), // 6
	pickedString: _registerBuiltInType("pickedString"), // 7
	supersaw: _registerBuiltInType("supersaw"), // 8
	customChipWave: _registerBuiltInType("customChipWave"), // 9
	mod: _registerBuiltInType("mod"), // 10
	fm6op: _registerBuiltInType("fm6op"), // 11
	opl3: _registerBuiltInType("opl3"), // 12
} as const;

export type InstrumentType = (typeof InstrumentType)[keyof typeof InstrumentType];

export const InstrumentTypeLength: number = _nextInstrumentTypeId;

export function registerInstrumentType(name: string): number {
	if (_instrumentTypeMap.has(name)) {
		return _instrumentTypeMap.get(name)!;
	}
	const id = _nextInstrumentTypeId++;
	_instrumentTypeMap.set(name, id);
	_instrumentTypeNames[id] = name;
	return id;
}

export function getInstrumentTypeName(id: number): string {
	return _instrumentTypeNames[id] ?? "unknown";
}

export function getInstrumentTypeId(name: string): number | undefined {
	return _instrumentTypeMap.get(name);
}

export function getRegisteredInstrumentTypeCount(): number {
	return _nextInstrumentTypeId;
}

// Helper to rebuild type names array from the registry
export function getRegisteredInstrumentTypeNames(): string[] {
	return _instrumentTypeNames.slice();
}

export const TypePresets: ReadonlyArray<string> = [
	"chip",
	"FM",
	"noise",
	"spectrum",
	"drumset",
	"harmonics",
	"pulse width",
	"picked string",
	"supersaw",
	"chip (custom)",
	"mod",
	"FM (6-op)",
	"OPL3",
];
