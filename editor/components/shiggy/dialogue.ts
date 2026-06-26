// dialogue.ts
//
// Purpose: Re-exports dialogue helpers from bubbles for backwards compatibility
//
// This module:
// - Preserves legacy imports; new code should import from bubbles directly

export {
	clearDialogue,
	forceEndConversation,
	positionDialogue,
	showNpcDialogue,
	startConversation,
} from "./bubbles";
