// Animations
//
// Purpose: @keyframes definitions for editor UI animations
//
// Extracted from style.ts to keep the monolithic CSS file focused on layout
// and component selectors. Each animation is a single responsibility — no
// external selector dependencies beyond the class names referenced here.
//
// Contributes to the same injected <style> element as style.ts.

import { Animation } from "../../ui/style-constants";

export function buildAnimationsCSS(): string {
	return `\
/* fill-mode: both applies the from-state (opacity 0, scale 0.96) before
 * the animation starts, so the class doubles as the pre-enter hide set
 * before append — no inline opacity needed. Forwards keeps the to-state
 * until animationend removes the class. */
.beepboxEditor .prompt.entering {
	animation: prompt-enter 150ms ${Animation.easingDefault} both;
}

@keyframes prompt-enter {
	from { opacity: 0; transform: scale(0.96); }
	to { opacity: 1; transform: scale(1); }
}

.beepboxEditor .prompt.exiting {
	animation: prompt-exit 150ms ${Animation.easingDefault} forwards;
	pointer-events: none;
}

@keyframes prompt-exit {
	from { opacity: 1; transform: scale(1); }
	to { opacity: 0; transform: scale(0.96); }
}

/* PMD: brief 88x outline flash when the user reopens or
 * re-focuses a prompt that's already in the stack — the same
 * visual language as a window manager 'raise' gesture, so the
 * user gets confirmation that the prompt is on top again.
 * The class is added by the manager and removed on animationend. */
.beepboxEditor .prompt.refocus {
	animation: prompt-refocus 200ms ${Animation.easingDefault};
}

@keyframes prompt-refocus {
	from {
		/* PMD: 64x (subtext) is a low-prominence tier — appropriate
		 * for a transient raise gesture that shouldn't compete with
		 * 80x focus / 88x titlebar heading. Settles to 80x at the
		 * end so the prompt is left in the same visible state as
		 * the steady .focused / :hover outline. */
		outline: 2px solid var(--subtext, var(--primary-text));
		outline-offset: -2px;
	}
	to {
		outline: 2px solid var(--hout, var(--primary-text));
		outline-offset: -2px;
	}
}

/* Reduced motion: collapse prompt lifecycle animations to a near-zero
 * duration. Duration 0.01ms (not animation: none) preserves the
 * animationend event that prompt-manager.ts relies on for exit cleanup
 * (doRemove) and class teardown. Fill-mode stays, so entering still
 * pre-hides and exiting still settles at opacity 0 before removal. */
@media (prefers-reduced-motion: reduce) {
	.beepboxEditor .prompt.entering {
		animation-duration: 0.01ms;
	}
	.beepboxEditor .prompt.exiting {
		animation-duration: 0.01ms;
	}
	.beepboxEditor .prompt.refocus {
		animation-duration: 0.01ms;
	}
}

@keyframes dash-animation {
  to {
    stroke-dashoffset: -100;
  }
}

@keyframes shiggy-bounce {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-6px); }
}
@keyframes shiggy-rock {
	0%, 100% { transform: rotate(-3deg); }
	50% { transform: rotate(3deg); }
}
@keyframes shiggy-enter {
	0% { transform: scale(0); opacity: 0; }
	60% { transform: scale(1.15); opacity: 1; }
	100% { transform: scale(1); opacity: 1; }
}

.beepboxEditor .dash-move {
	animation: dash-animation 20s infinite linear;
}`;
}
