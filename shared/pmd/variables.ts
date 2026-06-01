// pmd/variables.ts
//
// Purpose: PMD foundation color slots and alpha compositing
//
// This module:
// - Defines the -x foundation palette (hand-picked, not derived)
// - Provides composite() / stack() for layering surfaces at any opacity
// - Variables follow the naming convention: -x × opacity% [+hueOffset]

export interface PMDVariable {
	l: number;
	c: number;
	h?: number;
}

export type PMDVariables = Record<string, PMDVariable>;

export const PMD_DARK: PMDVariables = {
	"100x": { l: 1.0, c: 0.0 },
	"88x": { l: 0.88, c: 0.056 },
	"80x": { l: 0.8, c: 0.1 },
	"64x": { l: 0.64, c: 0.111 },
	"8x": { l: 0.2, c: 0.032 },
	"4x": { l: 0.16, c: 0.022 },
	"0x": { l: 0.0, c: 0.0 },
};

export const PMD_LIGHT: PMDVariables = {
	"100x": { l: 0.0, c: 0.0 },
	"88x": { l: 0.28, c: 0.032 },
	"80x": { l: 0.2, c: 0.032 },
	"64x": { l: 0.36, c: 0.058 },
	"8x": { l: 0.88, c: 0.056 },
	"4x": { l: 0.92, c: 0.044 },
	"0x": { l: 1.0, c: 0.0 },
};

export function composite(bg: PMDVariable, fg: PMDVariable, alpha: number): PMDVariable {
	return {
		l: bg.l * (1 - alpha) + fg.l * alpha,
		c: bg.c * (1 - alpha) + fg.c * alpha,
	};
}

export function stack(base: PMDVariable, tint: PMDVariable, opacity: number, hueOffset?: number): PMDVariable {
	const result = composite(base, tint, opacity);
	if (hueOffset !== undefined && tint.h !== undefined) {
		result.h = (tint.h + hueOffset + 360) % 360;
	}
	return result;
}

export function bake(pmd: PMDVariables, fg: PMDVariable, alpha: number): PMDVariable {
	return composite(pmd["0x"], fg, alpha);
}

export function getComputed(pmd: PMDVariables): { surface: PMDVariable; muted: PMDVariable } {
	return {
		surface: composite(pmd["8x"], pmd["80x"], 0.08),
		muted: composite(pmd["8x"], pmd["80x"], 0.48),
	};
}

export const HUE_MAX = 360;
export const AUX_HUE_OFFSET = 180;

export function getAuxHue(hue: number): number {
	return (hue + AUX_HUE_OFFSET) % HUE_MAX;
}

export function getPMD(isDark: boolean): { pmd: PMDVariables; computed: ReturnType<typeof getComputed> } {
	const pmd = isDark ? PMD_DARK : PMD_LIGHT;
	return { pmd, computed: getComputed(pmd) };
}
