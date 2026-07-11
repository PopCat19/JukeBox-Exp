// Purpose: Enforces generation-safe ownership of one live navigator pane.

import type { PaneHost, PaneLifecycle, SerializableValue } from "./contracts";
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
	private busy = false;

	open(owner: PaneOwner): OwnershipToken {
		return this.transfer(this.currentToken(), owner);
	}

	mount(token: OwnershipToken, host: PaneHost): boolean {
		return this.run(token, (owner) => {
			owner.lifecycle.mount(host);
		});
	}

	suspend(token: OwnershipToken): boolean {
		return this.run(token, (owner) => {
			owner.lifecycle.suspend();
		});
	}

	resume(token: OwnershipToken): boolean {
		return this.run(token, (owner) => {
			owner.lifecycle.resume();
		});
	}

	unmount(token: OwnershipToken): boolean {
		return this.run(token, (owner) => {
			owner.lifecycle.unmount();
		});
	}

	close(token: OwnershipToken): boolean {
		const owner = this.release(token);
		if (owner === null) return false;
		this.invoke(() => {
			owner.lifecycle.unmount();
		});
		return true;
	}

	dispose(token: OwnershipToken): boolean {
		const owner = this.release(token);
		if (owner === null) return false;
		this.invoke(() => {
			owner.lifecycle.dispose();
		});
		return true;
	}

	transfer(token: OwnershipToken | null, owner: PaneOwner): OwnershipToken {
		if (this.busy) throw new Error("pane ownership lifecycle callback is busy");
		if (token !== null && !this.accepts(token))
			throw new Error("stale pane ownership generation");
		if (token === null && this.owner !== null)
			throw new Error("live pane ownership requires current generation");
		if (this.owner?.identity === owner.identity) {
			this.owner.focus();
			return { generation: this.generation, identity: this.owner.identity };
		}
		const previous = this.owner;
		const nextGeneration = this.generation + 1;
		this.owner = owner;
		this.generation = nextGeneration;
		if (previous !== null)
			this.invoke(() => {
				previous.lifecycle.unmount();
			});
		return { generation: nextGeneration, identity: owner.identity };
	}

	currentToken(): OwnershipToken | null {
		return this.owner === null
			? null
			: { generation: this.generation, identity: this.owner.identity };
	}

	private release(token: OwnershipToken): PaneOwner | null {
		if (this.busy) return null;
		const owner = this.acceptedOwner(token);
		if (owner === null) return null;
		this.owner = null;
		this.generation++;
		return owner;
	}

	private run(token: OwnershipToken, callback: (owner: PaneOwner) => void): boolean {
		if (this.busy) return false;
		const owner = this.acceptedOwner(token);
		if (owner === null) return false;
		this.invoke(() => {
			callback(owner);
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
		return this.accepts(token) ? this.owner : null;
	}

	private accepts(token: OwnershipToken): boolean {
		return (
			this.owner !== null &&
			token.generation === this.generation &&
			token.identity === this.owner.identity
		);
	}
}
