// Purpose: Coordinates transactional groups of canonical navigator pane owners.

import type { HostLease, PaneHost, PaneRoute } from "./contracts";
import { type OwnershipToken, type PaneOwner, PaneOwnership } from "./ownership";
import { canonicalRouteIdentity, type PaneIdentity } from "./route-identity";

export interface WorkspacePaneOwner extends PaneOwner {
	handleKeyboard?(event: KeyboardEvent): boolean;
}

export type WorkspacePaneFactory = (route: PaneRoute) => WorkspacePaneOwner;
export interface WorkspaceChildSpec {
	readonly route: PaneRoute;
	readonly host: PaneHost;
}

declare const WorkspaceTokenBrand: unique symbol;
export interface WorkspaceToken {
	readonly [WorkspaceTokenBrand]: never;
}

export interface WorkspaceDetachResult {
	readonly owner: WorkspacePaneOwner;
	readonly ownership: PaneOwnership;
	readonly ownershipToken: OwnershipToken;
	readonly lease: HostLease;
	readonly workspaceToken: WorkspaceToken | null;
}

interface LiveChild {
	readonly identity: PaneIdentity;
	readonly owner: WorkspacePaneOwner;
	readonly ownership: PaneOwnership;
	readonly token: OwnershipToken;
	lease: HostLease;
}

export class WorkspaceRuntime {
	private children: LiveChild[] = [];
	private activeIdentity: PaneIdentity | null = null;
	private focusedIdentity: PaneIdentity | null = null;
	private currentWorkspaceToken: WorkspaceToken | null = null;
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly factory: WorkspacePaneFactory,
		private readonly onCleanupError: (error: unknown) => void = (error) => {
			console.error("[navigator workspace] committed pane cleanup failed", error);
		},
	) {}

	open(specs: readonly WorkspaceChildSpec[]): Promise<WorkspaceToken> {
		return this.serialize(() => {
			if (this.currentWorkspaceToken !== null) throw new Error("workspace already open");
			this.validateSpecs(specs);
			const staged = this.stageChildren(specs);
			this.install(staged);
			return this.issueToken();
		});
	}

	// Selection is logical only. Hosts own visibility because PaneLifecycle does not
	// declare that arbitrary panes support suspension while mounted.
	replace(
		token: WorkspaceToken,
		specs: readonly WorkspaceChildSpec[],
	): Promise<WorkspaceToken | null> {
		return this.serialize(async () => {
			if (!this.isCurrent(token)) return null;
			this.validateSpecs(specs);
			if (!(await this.preflightLeave(token))) return null;
			if (!this.isCurrent(token)) return null;
			const staged = this.stageChildren(specs);
			const previous = this.children;
			this.install(staged);
			const replacementToken = this.issueToken();
			this.cleanupCommitted(previous);
			return replacementToken;
		});
	}

	replaceChild(
		token: WorkspaceToken,
		oldRoute: PaneRoute,
		replacement: WorkspaceChildSpec,
	): Promise<WorkspaceToken | null> {
		return this.serialize(async () => {
			if (!this.isCurrent(token)) return null;
			const oldIdentity = canonicalRouteIdentity(oldRoute);
			const index = this.children.findIndex((child) => child.identity === oldIdentity);
			if (index < 0) return null;
			const replacementIdentity = canonicalRouteIdentity(replacement.route);
			if (replacementIdentity === oldIdentity) return token;
			if (
				this.children.some(
					(child, childIndex) =>
						childIndex !== index && child.identity === replacementIdentity,
				)
			)
				throw new Error("duplicate pane identity in workspace");
			const previous = this.children[index];
			if ((await previous.owner.lifecycle.requestLeave()) !== "allow") return null;
			if (!this.isCurrent(token)) return null;
			const staged = this.stageChildren([replacement])[0];
			const wasActive = this.activeIdentity === oldIdentity;
			const wasFocused = this.focusedIdentity === oldIdentity;
			this.children[index] = staged;
			if (wasActive) this.activeIdentity = replacementIdentity;
			if (wasFocused) this.focusedIdentity = replacementIdentity;
			const replacementToken = this.issueToken();
			this.cleanupCommitted([previous]);
			return replacementToken;
		});
	}

	refreshChild(
		token: WorkspaceToken,
		route: PaneRoute,
		replacement: WorkspaceChildSpec,
	): Promise<WorkspaceToken | null> {
		return this.serialize(async () => {
			if (!this.isCurrent(token)) return null;
			const identity = canonicalRouteIdentity(route);
			if (canonicalRouteIdentity(replacement.route) !== identity)
				throw new Error("refreshed pane identity must remain unchanged");
			const index = this.children.findIndex((child) => child.identity === identity);
			if (index < 0) return null;
			const previous = this.children[index];
			if ((await previous.owner.lifecycle.requestLeave()) !== "allow") return null;
			if (!this.isCurrent(token)) return null;
			const staged = this.stageChildren([replacement])[0];
			this.children[index] = staged;
			const replacementToken = this.issueToken();
			this.cleanupCommitted([previous]);
			return replacementToken;
		});
	}

	close(token: WorkspaceToken): Promise<boolean> {
		return this.serialize(async () => {
			if (!this.isCurrent(token)) return false;
			let allowed = true;
			for (const child of this.children) {
				if ((await child.owner.lifecycle.requestClose()) !== "close") allowed = false;
				if (!this.isCurrent(token)) return false;
			}
			if (!allowed) return false;
			const previous = this.children;
			this.reset();
			this.cleanupCommitted(previous);
			return true;
		});
	}

	switchActive(token: WorkspaceToken, route: PaneRoute): Promise<boolean> {
		return this.serialize(async () => {
			if (!this.isCurrent(token)) return false;
			const identity = canonicalRouteIdentity(route);
			if (!this.children.some((child) => child.identity === identity)) return false;
			if (identity === this.activeIdentity) return true;
			const active = this.children.find((child) => child.identity === this.activeIdentity);
			if (active && (await active.owner.lifecycle.requestLeave()) !== "allow") return false;
			if (!this.isCurrent(token)) return false;
			this.activeIdentity = identity;
			this.focusedIdentity = identity;
			return true;
		});
	}

	focus(route: PaneRoute): boolean {
		const identity = canonicalRouteIdentity(route);
		const child = this.children.find((candidate) => candidate.identity === identity);
		if (!child) return false;
		this.activeIdentity = identity;
		this.focusedIdentity = identity;
		child.owner.focus();
		return true;
	}

	openDuplicate(route: PaneRoute): boolean {
		return this.focus(route);
	}

	async forwardKeyboard(event: KeyboardEvent): Promise<boolean> {
		const child = this.focusedChild() ?? this.activeChild() ?? this.children[0];
		if (!child) return false;
		if (event.key === "Escape") {
			const token = this.currentWorkspaceToken;
			return token === null ? false : this.closeChild(token, child.identity);
		}
		return child.owner.handleKeyboard?.(event) ?? false;
	}

	detachChild(
		token: WorkspaceToken,
		route: PaneRoute,
		host: PaneHost,
	): Promise<WorkspaceDetachResult | null> {
		return this.serialize(() => {
			if (!this.isCurrent(token)) return null;
			const identity = canonicalRouteIdentity(route);
			const index = this.children.findIndex((child) => child.identity === identity);
			if (index < 0) return null;
			const child = this.children[index];
			const lease = child.ownership.transferHost(child.token, child.lease, host);
			child.lease = lease;
			this.children.splice(index, 1);
			this.repairSelection();
			let workspaceToken: WorkspaceToken | null;
			if (this.children.length === 0) {
				this.reset();
				workspaceToken = null;
			} else {
				workspaceToken = this.issueToken();
			}
			return {
				owner: child.owner,
				ownership: child.ownership,
				ownershipToken: child.token,
				lease,
				workspaceToken,
			};
		});
	}

	identities(): readonly PaneIdentity[] {
		return this.children.map((child) => child.identity);
	}
	active(): PaneIdentity | null {
		return this.activeIdentity;
	}

	private closeChild(token: WorkspaceToken, identity: PaneIdentity): Promise<boolean> {
		return this.serialize(async () => {
			if (!this.isCurrent(token)) return false;
			const index = this.children.findIndex((child) => child.identity === identity);
			if (index < 0) return false;
			const child = this.children[index];
			if (!(await child.ownership.close(child.token, child.lease))) return false;
			this.children.splice(index, 1);
			this.repairSelection();
			if (this.children.length === 0) this.reset();
			else this.issueToken();
			return true;
		});
	}

	private stageChildren(specs: readonly WorkspaceChildSpec[]): LiveChild[] {
		const identities = specs.map((spec) => canonicalRouteIdentity(spec.route));
		const staged: LiveChild[] = [];
		try {
			for (let index = 0; index < specs.length; index++) {
				const owner = this.factory(specs[index].route);
				if (owner.identity !== identities[index]) {
					try {
						owner.lifecycle.dispose();
					} catch {
						/* Contract error remains primary. */
					}
					throw new Error("pane factory returned wrong identity");
				}
				const ownership = new PaneOwnership();
				const token = ownership.open(owner);
				const lease = ownership.mount(token, specs[index].host);
				if (lease === null) {
					try {
						ownership.dispose(token);
					} catch {
						/* Mount failure remains the primary staging error. */
					}
					throw new Error("workspace child mount failed");
				}
				staged.push({ identity: identities[index], owner, ownership, token, lease });
			}
			return staged;
		} catch (error) {
			this.cleanupPreserving(staged, error);
		}
	}

	private async preflightLeave(token: WorkspaceToken): Promise<boolean> {
		let allowed = true;
		for (const child of this.children) {
			if ((await child.owner.lifecycle.requestLeave()) !== "allow") allowed = false;
			if (!this.isCurrent(token)) return false;
		}
		return allowed;
	}

	private validateSpecs(specs: readonly WorkspaceChildSpec[]): void {
		if (specs.length === 0) throw new Error("workspace requires at least one child");
		const identities = specs.map((spec) => canonicalRouteIdentity(spec.route));
		if (new Set(identities).size !== identities.length)
			throw new Error("duplicate pane identity in workspace");
	}

	private cleanup(children: readonly LiveChild[]): void {
		let firstError: unknown;
		for (let index = children.length - 1; index >= 0; index--) {
			const child = children[index];
			try {
				child.ownership.unmount(child.token, child.lease);
			} catch (error) {
				firstError ??= error;
			}
			try {
				child.ownership.dispose(child.token);
			} catch (error) {
				firstError ??= error;
			}
		}
		if (firstError instanceof Error) throw firstError;
		if (firstError !== undefined)
			throw new Error("workspace cleanup failed", { cause: firstError });
	}

	private cleanupPreserving(children: readonly LiveChild[], primary: unknown): never {
		try {
			this.cleanup(children);
		} catch {
			/* Primary construction or decision error wins. */
		}
		throw primary;
	}

	private cleanupCommitted(children: readonly LiveChild[]): void {
		try {
			this.cleanup(children);
		} catch (error) {
			try {
				this.onCleanupError(error);
			} catch (reportingError) {
				console.error(
					"[navigator workspace] cleanup error reporter failed",
					reportingError,
				);
			}
		}
	}

	private install(children: LiveChild[]): void {
		this.children = children;
		this.activeIdentity = children[0]?.identity ?? null;
		this.focusedIdentity = this.activeIdentity;
	}

	private reset(): void {
		this.children = [];
		this.activeIdentity = null;
		this.focusedIdentity = null;
		this.currentWorkspaceToken = null;
	}

	private repairSelection(): void {
		if (!this.children.some((child) => child.identity === this.activeIdentity))
			this.activeIdentity = this.children[0]?.identity ?? null;
		if (!this.children.some((child) => child.identity === this.focusedIdentity))
			this.focusedIdentity = this.activeIdentity;
	}

	private focusedChild(): LiveChild | undefined {
		return this.children.find((child) => child.identity === this.focusedIdentity);
	}
	private activeChild(): LiveChild | undefined {
		return this.children.find((child) => child.identity === this.activeIdentity);
	}

	private issueToken(): WorkspaceToken {
		const token = Object.freeze({}) as WorkspaceToken;
		this.currentWorkspaceToken = token;
		return token;
	}

	private isCurrent(token: WorkspaceToken): boolean {
		return this.currentWorkspaceToken !== null && token === this.currentWorkspaceToken;
	}

	private serialize<T>(operation: () => T | Promise<T>): Promise<T> {
		const result = this.queue.then(operation, operation);
		this.queue = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}
}
