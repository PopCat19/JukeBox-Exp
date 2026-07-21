// Purpose: Renders and controls the transient compact command palette.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import {
	type CommandDefinition,
	type CommandExecutionContext,
	rankCommands,
	splitCommandLine,
} from "../navigator/command-registry";

const { div, input } = HTML;

export class CommandPalette {
	public readonly container: HTMLDivElement = div({ class: "command-palette", hidden: true });
	private readonly input: HTMLInputElement = input({
		class: "command-palette-input",
		type: "text",
		autocomplete: "off",
		spellcheck: "false",
		"aria-label": "Command",
	});
	private readonly results = div({ class: "command-palette-results", role: "listbox" });
	private readonly hint = div({ class: "command-palette-hint" });
	private readonly error = div({ class: "command-palette-error", role: "alert" });
	private ranked: readonly CommandDefinition[] = [];
	private selectedIndex = 0;
	private returnFocus: HTMLElement | null = null;
	private executing = false;

	constructor(
		private readonly executionContext: CommandExecutionContext,
		private readonly afterClose: () => void,
	) {
		this.container.append(this.input, this.results, this.hint, this.error);
		this.input.addEventListener("input", this.render);
		this.input.addEventListener("keydown", this.handleKeyDown);
	}

	get isOpen(): boolean {
		return !this.container.hidden;
	}

	open(): void {
		if (this.isOpen) return;
		this.returnFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		this.container.hidden = false;
		this.input.value = "";
		this.error.textContent = "";
		this.selectedIndex = 0;
		this.render();
		this.input.focus({ preventScroll: true });
	}

	close(): void {
		if (!this.isOpen) return;
		this.container.hidden = true;
		this.input.value = "";
		this.error.textContent = "";
		this.returnFocus?.focus({ preventScroll: true });
		this.returnFocus = null;
		this.afterClose();
	}

	private render = (): void => {
		this.ranked = rankCommands(this.input.value).slice(0, 7);
		this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.ranked.length - 1));
		this.results.replaceChildren();
		for (let index = 0; index < this.ranked.length; index++) {
			const command = this.ranked[index];
			const row = div(
				{
					class: `command-palette-result${index === this.selectedIndex ? " selected" : ""}`,
					role: "option",
					"aria-selected": String(index === this.selectedIndex),
					onmousedown: (event: MouseEvent) => {
						event.preventDefault();
					},
					onclick: () => {
						this.selectedIndex = index;
						void this.executeSelected();
					},
				},
				command.label,
			);
			this.results.append(row);
		}
		const command = this.ranked[this.selectedIndex];
		this.hint.textContent =
			command?.arguments.kind === "none" ? "" : (command?.arguments.hint ?? "");
		this.error.textContent = "";
	};

	private handleKeyDown = (event: KeyboardEvent): void => {
		event.stopPropagation();
		if (event.key === "Escape") {
			event.preventDefault();
			this.close();
			return;
		}
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const offset = event.key === "ArrowDown" ? 1 : -1;
			this.selectedIndex = Math.max(
				0,
				Math.min(this.ranked.length - 1, this.selectedIndex + offset),
			);
			this.render();
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			void this.executeSelected();
		}
	};

	private async executeSelected(): Promise<void> {
		if (this.executing) return;
		const command = this.ranked[this.selectedIndex];
		if (command === undefined) {
			this.error.textContent = "No matching command.";
			return;
		}
		this.executing = true;
		try {
			const result = await command.execute(
				this.executionContext,
				splitCommandLine(this.input.value).argumentText,
			);
			if (result.ok) {
				this.close();
			} else {
				this.error.textContent = result.error ?? "Command failed.";
			}
		} catch (error) {
			this.error.textContent = error instanceof Error ? error.message : String(error);
		} finally {
			this.executing = false;
		}
	}
}
