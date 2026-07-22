// Purpose: Defines the same-origin message contract for synchronizing embedded player themes.

export const PLAYER_THEME_SYNC_TYPE = "jukebox-player-theme-sync";

export interface PlayerThemeSyncMessage {
	readonly type: typeof PLAYER_THEME_SYNC_TYPE;
	readonly theme: string;
	readonly pmdControlHue: number;
	readonly pmdEffectiveHue: number;
}

export function createPlayerThemeSyncMessage(
	theme: string,
	pmdControlHue: number,
	pmdEffectiveHue: number,
): PlayerThemeSyncMessage {
	return {
		type: PLAYER_THEME_SYNC_TYPE,
		theme,
		pmdControlHue,
		pmdEffectiveHue,
	};
}

export function isPlayerThemeSyncMessage(value: unknown): value is PlayerThemeSyncMessage {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<PlayerThemeSyncMessage>;
	return (
		candidate.type === PLAYER_THEME_SYNC_TYPE &&
		typeof candidate.theme === "string" &&
		candidate.theme.length > 0 &&
		typeof candidate.pmdControlHue === "number" &&
		Number.isFinite(candidate.pmdControlHue) &&
		typeof candidate.pmdEffectiveHue === "number" &&
		Number.isFinite(candidate.pmdEffectiveHue)
	);
}
