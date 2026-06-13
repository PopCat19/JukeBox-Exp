// Prompt
//
// Purpose: Defines the Prompt interface for modal dialog components
//
// This module:
// - Specifies container and cleanup contract for prompts
// - Tracks mouse-up state for prompt dismissal

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

export interface Prompt {
	name?: string;
	id: number;
	container: HTMLElement;
	cleanUp: () => void;
	buildTitlebar?: (() => void) | undefined;
	whenKeyPressed?: ((event: KeyboardEvent) => void) | undefined;
	gotMouseUp?: boolean | undefined;
	closeWithoutUndo?: (() => void) | undefined;
	closeCallback?: ((prompt: Prompt) => void) | undefined;
	openAlongsideCallback?: ((promptName: string) => void) | undefined;
	animateExit?: ((callback: () => void) => void) | undefined;
	// Number of times the manager has routed an 'open' call to
	// this prompt. The first invocation (spawn) is count 1, the
	// second is count 2, etc. Used to suppress the 88x 'raise'
	// flash on the very first open — the entering animation is
	// the feedback for the spawn, and flashing 88x on top of it
	// would be redundant.
	openCount?: number;
}
