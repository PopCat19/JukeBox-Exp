// Purpose: Enforces generation-safe ownership of one live navigator pane with
// async replace/close, host transfer with rollback, and opaque HostLease.

import type { HostLease, PaneHost, PaneLifecycle, SerializableValue } from "./contracts";
import type { PaneIdentity } from "./route-identity";

export interface PaneOwner<State extends SerializableValue = SerializableValue> {
	readonly identity: PaneIdentity;
	readonly lifecycle: PaneLifecycle<State>;
	focus(): void;
}

export interface OwnershipToken {
	readonly generation: number;
	readonly identity: PaneIdentity;
}

export class PaneOwnership {
	private generation = 0;
	private owner: PaneOwner | null = null;
	private host: PaneHost | null = null;
	private mounted = false;
	private leaseGen = -1;
	private busy = false;

	open(owner: PaneOwner): OwnershipToken {
		if (this.busy) throw new Error("pane ownership lifecycle callback is busy");
		if (this.owner === null) {
			this.generation++;
			this.owner = owner;
			this.host = null;
			this.mounted = false;
			return { generation: this.generation, identity: owner.identity };
		}
		if (this.owner.identity === owner.identity) {
			this.invoke(() => {
				this.owner!.focus();
			});
			return this.token();
		}
		throw new Error("different identity requires async replace");
	}

	mount(token: OwnershipToken, mountHost: PaneHost): HostLease | null {
		if (this.busy) return null;
		if (!this.isCurrent(token)) return null;
		if (this.mounted) return null;
		this.busy = true;
		try {
			this.owner!.lifecycle.mount(mountHost);
			this.host = mountHost;
			this.mounted = true;
			this.leaseGen++;
			return { generation: this.leaseGen } as HostLease;
		} catch {
			return null;
		} finally {
			this.busy = false;
		}
	}

	suspend(token: OwnershipToken, lease: HostLease): boolean {
		return this.runMounted(token, lease, (owner) => {
			owner.lifecycle.suspend();
		});
	}

	resume(token: OwnershipToken, lease: HostLease): boolean {
		return this.runMounted(token, lease, (owner) => {
			owner.lifecycle.resume();
		});
	}

	unmount(token: OwnershipToken, lease: HostLease): boolean {
		return this.runMounted(token, lease, (owner) => {
			this.mounted = false;
			owner.lifecycle.unmount();
		});
	}

	transferHost(token: OwnershipToken, lease: HostLease, newHost: PaneHost): HostLease {
		if (this.busy) throw new Error("pane ownership lifecycle callback is busy");
		if (!this.isCurrent(token)) throw new Error("stale pane ownership generation");
		if (!this.isLeaseCurrent(lease)) throw new Error("stale host lease");
		if (!this.mounted || this.host === null) throw new Error("pane not mounted");
		const oldHost = this.host;
		this.busy = true;
		try {
			this.owner!.lifecycle.unmount();
			this.mounted = false;
			let mountError: unknown = null;
			try {
				this.owner!.lifecycle.mount(newHost);
			} catch (e) {
				mountError = e;
			}
			if (mountError !== null) {
				let rollbackError: unknown = null;
				try {
					this.owner!.lifecycle.mount(oldHost);
					this.host = oldHost;
					this.mounted = true;
				} catch (e) {
					rollbackError = e;
				}
				if (rollbackError !== null) {
					this.mounted = false;
					this.host = null;
					this.leaseGen++;
					throw new AggregateError(
						[mountError as Error, rollbackError as Error],
						"transferHost failed: mount and rollback both failed",
					);
				}
				throw mountError as Error;
			}
			this.host = newHost;
			this.mounted = true;
			this.leaseGen++;
			return { generation: this.leaseGen } as HostLease;
		} finally {
			this.busy = false;
		}
	}

	async replace(
		token: OwnershipToken,
		lease: HostLease,
		newOwner: PaneOwner,
	): Promise<OwnershipToken | null> {
		if (this.busy) return null;
		if (!this.isCurrent(token)) return null;
		if (!this.isLeaseCurrent(lease)) return null;
		if (this.owner!.identity === newOwner.identity) {
			this.invoke(() => {
				this.owner!.focus();
			});
			return this.token();
		}
		const decision = await this.owner!.lifecycle.requestLeave();
		if (!this.isCurrent(token)) return null;
		if (!this.isLeaseCurrent(lease)) return null;
		if (decision !== "allow") return null;
		const previous = this.owner;
		this.generation++;
		this.owner = newOwner;
		this.host = null;
		this.mounted = false;
		this.invoke(() => {
			previous!.lifecycle.unmount();
		});
		return { generation: this.generation, identity: newOwner.identity };
	}

	async close(token: OwnershipToken, lease: HostLease): Promise<boolean> {
		if (this.busy) return false;
		if (!this.isCurrent(token)) return false;
		if (!this.isLeaseCurrent(lease)) return false;
		const decision = await this.owner!.lifecycle.requestClose();
		if (!this.isCurrent(token)) return false;
		if (!this.isLeaseCurrent(lease)) return false;
		if (decision !== "close") return false;
		this.generation++;
		const previous = this.owner;
		this.owner = null;
		this.host = null;
		this.mounted = false;
		this.invoke(() => {
			previous!.lifecycle.unmount();
		});
		return true;
	}

	dispose(token: OwnershipToken, lease?: HostLease): boolean {
		if (this.busy) return false;
		if (!this.isCurrent(token)) return false;
		if (this.mounted) {
			if (!lease || !this.isLeaseCurrent(lease)) return false;
		}
		const owner = this.release(token);
		if (owner === null) return false;
		this.invoke(() => {
			owner.lifecycle.dispose();
		});
		return true;
	}

	currentToken(): OwnershipToken | null {
		return this.owner === null ? null : this.token();
	}

	private release(token: OwnershipToken): PaneOwner | null {
		if (this.busy) return null;
		const owner = this.acceptedOwner(token);
		if (owner === null) return null;
		this.owner = null;
		this.generation++;
		this.host = null;
		this.mounted = false;
		return owner;
	}

	private runMounted(
		token: OwnershipToken,
		lease: HostLease,
		callback: (owner: PaneOwner) => void,
	): boolean {
		if (this.busy) return false;
		if (!this.isCurrent(token)) return false;
		if (!this.isLeaseCurrent(lease)) return false;
		this.invoke(() => {
			callback(this.owner!);
		});
		return true;
	}

	private invoke(callback: () => void): void {
		this.busy = true;
		try {
			callback();
		} finally {
			this.busy = false;
		}
	}

	private acceptedOwner(token: OwnershipToken): PaneOwner | null {
		return this.isCurrent(token) ? this.owner : null;
	}

	private isCurrent(token: OwnershipToken): boolean {
		return (
			this.owner !== null &&
			token.generation === this.generation &&
			token.identity === this.owner.identity
		);
	}

	private isLeaseCurrent(lease: HostLease): boolean {
		return this.mounted && lease.generation === this.leaseGen;
	}

	private token(): OwnershipToken {
		return { generation: this.generation, identity: this.owner!.identity };
	}
}
