// decode-variant.ts
//
// Purpose: Detect song URL variant and compute version compatibility flags
//
// This module:
// - Reads the first bytes of a compressed song string to detect variant (BeepBox, JummBox, GoldBox, UltraBox, SlarmoosBox, JukeBox)
// - Parses the format version number and validates it against supported ranges
// - Computes compatibility booleans (beforeTwo through beforeNine, forceSimpleFilter)
// - Returns a DecodeVariantResult with charIndex, variant flags, and version booleans

import { base64CharCodeToInt } from "../serialization";
import { LATEST_JUKEBOX_VERSION } from "../song-serialization";
import {
	LATEST_BEEPBOX_VERSION,
	LATEST_GOLDBOX_VERSION,
	LATEST_JUMMBOX_VERSION,
	LATEST_SLARMOOSBOX_VERSION,
	LATEST_ULTRABOX_VERSION,
	OLDEST_BEEPBOX_VERSION,
	OLDEST_GOLDBOX_VERSION,
	OLDEST_JUKEBOX_VERSION,
	OLDEST_JUMMBOX_VERSION,
	OLDEST_SLARMOOSBOX_VERSION,
	OLDEST_ULTRABOX_VERSION,
} from "../song-serialization-shared";

export interface DecodeVariantResult {
	charIndex: number;
	fromBeepBox: boolean;
	fromJummBox: boolean;
	fromGoldBox: boolean;
	fromUltraBox: boolean;
	fromSlarmoosBox: boolean;
	fromJukeBox: boolean;
	version: number;
	beforeTwo: boolean;
	beforeThree: boolean;
	beforeFour: boolean;
	beforeFive: boolean;
	beforeSix: boolean;
	beforeSeven: boolean;
	beforeEight: boolean;
	beforeNine: boolean;
	forceSimpleFilter: boolean;
}

export function decodeVariant(compressed: string, startIndex: number): DecodeVariantResult | null {
	let charIndex: number = startIndex;

	const variantTest: number = compressed.charCodeAt(charIndex);
	let fromBeepBox: boolean = false;
	let fromJummBox: boolean = false;
	let fromGoldBox: boolean = false;
	let fromUltraBox: boolean = false;
	let fromSlarmoosBox: boolean = false;
	let fromJukeBox: boolean = false;

	// Detect variant here. If version doesn't match known variant, assume it is a vanilla string which does not report variant.
	if (variantTest === 0x6a) {
		// "j"
		fromJummBox = true;
		charIndex++;
	} else if (variantTest === 0x67) {
		// "g"
		fromGoldBox = true;
		charIndex++;
	} else if (variantTest === 0x75) {
		// "u"
		fromUltraBox = true;
		charIndex++;
	} else if (variantTest === 0x64) {
		// "d"
		fromJummBox = true;
		charIndex++;
	} else if (variantTest === 0x61) {
		// "a" Abyssbox does urls the same as ultrabox //not quite anymore, but oh well
		fromUltraBox = true;
		charIndex++;
	} else if (variantTest === 0x73) {
		// "s"
		fromSlarmoosBox = true;
		charIndex++;
	} else if (variantTest === 0x4a) {
		// "J"
		fromJukeBox = true;
		charIndex++;
	} else {
		fromBeepBox = true;
	}

	const version: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

	// Validate version against variant range
	if (
		fromBeepBox &&
		(version === -1 || version > LATEST_BEEPBOX_VERSION || version < OLDEST_BEEPBOX_VERSION)
	) {
		return null;
	}
	if (
		fromJummBox &&
		(version === -1 || version > LATEST_JUMMBOX_VERSION || version < OLDEST_JUMMBOX_VERSION)
	) {
		return null;
	}
	if (
		fromGoldBox &&
		(version === -1 || version > LATEST_GOLDBOX_VERSION || version < OLDEST_GOLDBOX_VERSION)
	) {
		return null;
	}
	if (
		fromUltraBox &&
		(version === -1 || version > LATEST_ULTRABOX_VERSION || version < OLDEST_ULTRABOX_VERSION)
	) {
		return null;
	}
	if (
		fromSlarmoosBox &&
		(version === -1 ||
			version > LATEST_SLARMOOSBOX_VERSION ||
			version < OLDEST_SLARMOOSBOX_VERSION)
	) {
		return null;
	}
	if (
		fromJukeBox &&
		(version === -1 || version > LATEST_JUKEBOX_VERSION || version < OLDEST_JUKEBOX_VERSION)
	) {
		return null;
	}

	const beforeTwo: boolean = version < 2;
	const beforeThree: boolean = version < 3;
	const beforeFour: boolean = version < 4;
	const beforeFive: boolean = version < 5;
	const beforeSix: boolean = version < 6;
	const beforeSeven: boolean = version < 7;
	const beforeEight: boolean = version < 8;
	const beforeNine: boolean = version < 9;

	const forceSimpleFilter: boolean = (fromBeepBox && beforeNine) || (fromJummBox && beforeFive);

	return {
		charIndex,
		fromBeepBox,
		fromJummBox,
		fromGoldBox,
		fromUltraBox,
		fromSlarmoosBox,
		fromJukeBox,
		version,
		beforeTwo,
		beforeThree,
		beforeFour,
		beforeFive,
		beforeSix,
		beforeSeven,
		beforeEight,
		beforeNine,
		forceSimpleFilter,
	};
}
