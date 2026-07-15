// Purpose: Coordinates one attached navigator pane and independent detached panes.

import type { HostLease, PaneHost, PaneRoute } from "./contracts";
import { type OwnershipToken, type PaneOwner, PaneOwnership } from "./ownership";
import { canonicalRouteIdentity, type PaneIdentity } from "./route-identity";

export type PaneFactory = (route: PaneRoute) => PaneOwner;
export interface DetachedPane {
	readonly identity: PaneIdentity;
	focus(): void;
	close(): Promise<boolean>;
}
interface DetachedRecord {
	readonly pane: DetachedPane;
	readonly ownership: PaneOwnership;
	readonly token: OwnershipToken;
	readonly lease: HostLease;
}

export class NavigatorRuntime {
	private ownership = new PaneOwnership();
	private readonly detached = new Map<PaneIdentity, DetachedRecord>();
	private token: OwnershipToken | null = null;
	private lease: HostLease | null = null;
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly host: PaneHost,
		private readonly factory: PaneFactory,
	) {}

	open(route: PaneRoute): Promise<boolean> {
		return this.serialize(() => this.openImpl(route));
	}

	openThen(route: PaneRoute, afterOpen: () => void): Promise<boolean> {
		return this.serialize(async () => {
			const opened = await this.openImpl(route);
			if (opened) afterOpen();
			return opened;
		});
	}

	private async openImpl(route: PaneRoute): Promise<boolean> {
		const identity = canonicalRouteIdentity(route);
		const detached = this.detached.get(identity);
		if (detached) {
			detached.pane.focus();
			return true;
		}
		if (this.token?.identity === identity) {
			const owner = this.ownership.currentOwner(this.token);
			if (owner === null) throw new Error("attached pane lacks owner");
			this.ownership.open(owner);
			return true;
		}
		if (
			this.token !== null &&
			(this.lease === null ||
				!(await this.ownership.requestReplace(this.token, this.lease, identity)))
		)
			return false;
		const next = this.factory(route);
		if (next.identity !== identity) throw new Error("pane factory returned wrong identity");
		if (this.token === null) {
			this.token = this.ownership.open(next);
			this.lease = this.ownership.mount(this.token, this.host);
			if (this.lease === null) {
				this.ownership.dispose(this.token);
				this.token = null;
				throw new Error("pane mount failed");
			}
			return true;
		}
		if (this.lease === null) throw new Error("attached pane lacks host lease");
		const replacement = this.ownership.replaceApproved(this.token, this.lease, next);
		if (replacement === null) {
			next.lifecycle.dispose();
			return false;
		}
		this.token = replacement;
		this.lease = this.ownership.mount(replacement, this.host);
		if (this.lease === null) {
			this.ownership.dispose(replacement);
			this.token = null;
			throw new Error("replacement pane mount failed");
		}
		return true;
	}

	detach(
		create: (
			owner: PaneOwner,
			host: PaneHost,
			close: () => Promise<boolean>,
			forceClose: () => Promise<void>,
		) => DetachedPane,
		host: PaneHost,
	): Promise<DetachedPane | null> {
		return this.serialize(() => {
			if (this.token === null || this.lease === null) return null;
			const token = this.token;
			const owner = this.ownership.currentOwner(token);
			if (owner === null) return null;
			const oldLease = this.lease;
			const detachedLease = this.ownership.transferHost(token, oldLease, host);
			const closeDetached = async (): Promise<boolean> => this.closeDetached(token.identity);
			let pane: DetachedPane;
			try {
				pane = create(owner, host, closeDetached, async () =>
					this.forceCloseDetached(token.identity),
				);
				owner.bindCloseAuthority?.(() => pane.close());
			} catch (error) {
				this.lease = this.ownership.transferHost(token, detachedLease, this.host);
				owner.bindCloseAuthority?.(() => this.closeNavigator());
				throw error;
			}
			this.detached.set(token.identity, {
				pane,
				ownership: this.ownership,
				token,
				lease: detachedLease,
			});
			this.ownership = new PaneOwnership();
			this.token = null;
			this.lease = null;
			return pane;
		});
	}

	closeNavigator(): Promise<boolean> {
		return this.serialize(async () => {
			if (this.token === null || this.lease === null) return true;
			const closed = await this.ownership.close(this.token, this.lease);
			if (closed) {
				this.token = null;
				this.lease = null;
			}
			return closed;
		});
	}

	findDetached(route: PaneRoute): DetachedPane | null {
		return this.detached.get(canonicalRouteIdentity(route))?.pane ?? null;
	}
	private async closeDetached(identity: PaneIdentity): Promise<boolean> {
		const record = this.detached.get(identity);
		if (record === undefined) return true;
		const closed = await record.ownership.close(record.token, record.lease);
		if (closed) this.detached.delete(identity);
		return closed;
	}

	private forceCloseDetached(identity: PaneIdentity): Promise<void> {
		return this.serialize(() => {
			const record = this.detached.get(identity);
			if (record === undefined) return;
			record.ownership.dispose(record.token, record.lease);
			this.detached.delete(identity);
		});
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
