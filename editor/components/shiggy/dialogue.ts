// dialogue.ts
// Re-exports from bubbles.ts for backwards compatibility.
// New code should import from bubbles directly.
export {
    showNpcDialogue,
    clearDialogue,
    positionDialogue,
    startConversation,
    forceEndConversation,
} from "./bubbles";
