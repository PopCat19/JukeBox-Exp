// PMD Hue
//
// Purpose: Defines pure local-clock and control policies for PMD hue.

export const PMD_HUE_COUNT = 360;
export const PMD_MANUAL_HUE_DEFAULT = 345;

export function normalizePMDHue(value: number, fallback = PMD_MANUAL_HUE_DEFAULT): number {
	if (!Number.isFinite(value)) return fallback;
	return ((Math.round(value) % PMD_HUE_COUNT) + PMD_HUE_COUNT) % PMD_HUE_COUNT;
}

export function clampPMDManualHue(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value === PMD_HUE_COUNT) return 0;
	return Math.max(0, Math.min(PMD_HUE_COUNT - 1, Math.round(value)));
}

export function normalizePMDOffset(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(-180, Math.min(180, Math.round(value)));
}

export function clockHue(date: Date): number {
	const minutes = date.getHours() * 60 + date.getMinutes();
	return Math.floor((minutes * PMD_HUE_COUNT) / 1440);
}

export function effectivePMDHue(clock: number, offset: number): number {
	return normalizePMDHue(clock + normalizePMDOffset(offset), 0);
}

export function nearestSignedPMDOffset(hue: number, clock: number): number {
	return ((normalizePMDHue(hue, 0) - normalizePMDHue(clock, 0) + 540) % 360) - 180;
}

export function millisecondsUntilNextMinute(date: Date): number {
	return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds());
}
