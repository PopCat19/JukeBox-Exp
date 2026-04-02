// Euclidgen Algorithm
//
// Purpose: Pure math functions for Euclidean rhythm generation and fraction arithmetic
//
// This module:
// - Implements GCD, LCM, and fraction operations
// - Implements Bjorklund's algorithm for Euclidean rhythm distribution
// - Defines the Sequence data contract

export interface Sequence {
	steps: number;
	pulses: number;
	rotation: number;
	stepSizeNumerator: number;
	stepSizeDenominator: number;
	channel: number;
	pitch: number;
	invert: boolean;
	generateFadingNotes: boolean;
}

export function gcd(x: number, y: number): number {
	while (y !== 0) {
		const z: number = x % y;
		x = y;
		y = z;
	}
	return x;
}

export function lcm(a: number, b: number): number {
	return Math.floor(Math.abs(a * b) / gcd(a, b));
}

type Fraction = [number, number];

export function fraction(a: number, b: number): Fraction {
	let n: number = a;
	let d: number = b;
	const g: number = gcd(n, d);
	if (g > 1) {
		n = Math.floor(n / g);
		d = Math.floor(d / g);
	}
	return [n, d];
}

export function fractionMul(a: Fraction, b: Fraction): Fraction {
	const an: number = a[0];
	const ad: number = a[1];
	const bn: number = b[0];
	const bd: number = b[1];
	return fraction(an * bn, ad * bd);
}

export function fractionDiv(a: Fraction, b: Fraction): Fraction {
	const an: number = a[0];
	const ad: number = a[1];
	const bn: number = b[0];
	const bd: number = b[1];
	return fraction(an * bd, ad * bn);
}

export function fractionLCM(a: Fraction, b: Fraction): Fraction {
	const an: number = a[0];
	const ad: number = a[1];
	const bn: number = b[0];
	const bd: number = b[1];
	return fraction(lcm(an, bn), gcd(ad, bd));
}

export function generateEuclideanRhythm(steps: number, pulses: number, offset: number): number[] {
	steps = Math.max(0, steps);
	pulses = Math.max(0, Math.min(steps, pulses));
	const columns: number[][] = [];
	for (let step: number = 0; step < steps; step++) {
		columns.push([step >= pulses ? 0 : 1]);
	}
	let a: number = steps;
	let b: number = steps - pulses;
	if (a > 0 && b > 0) {
		while (a !== b) {
			if (a > b) {
				a = a - b;
			} else {
				b = b - a;
			}
			const amountToMove: number = Math.min(a, b);
			if (amountToMove <= 1) continue;
			for (let i: number = 0; i < amountToMove; i++) {
				const moved: number[] | undefined = columns.pop();
				if (moved != null) {
					for (const v of moved) columns[i].push(v);
				}
			}
		}
	}
	let pattern: number[] = [];
	for (const c of columns) for (const v of c) pattern.push(v);
	if (offset !== 0) {
		offset = ((offset % pattern.length) + pattern.length) % pattern.length;
		offset = pattern.length - offset;
		pattern = pattern.slice(offset).concat(pattern.slice(0, offset));
	}
	return pattern;
}
