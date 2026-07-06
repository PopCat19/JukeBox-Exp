// inject.ts
//
// Purpose: Provides tagged global style injection with deduped updates.

export function injectGlobalStyles(doc: Document, id: string, css: string): HTMLStyleElement {
	const existingStyles = doc.head.querySelectorAll<HTMLStyleElement>("style[data-jb-style]");
	for (let index = 0; index < existingStyles.length; index++) {
		const existing = existingStyles.item(index);
		if (existing.getAttribute("data-jb-style") === id) {
			existing.textContent = css;
			return existing;
		}
	}

	const style = doc.createElement("style");
	style.setAttribute("type", "text/css");
	style.setAttribute("data-jb-style", id);
	style.textContent = css;
	doc.head.appendChild(style);
	return style;
}
