/**
 * A simple asynchronous Mutex to serialize operations.
 * Used to ensure that concurrent file saves and project-wide background
 * rewrites do not interleave and cause data loss.
 */
export class Mutex {
	private queue: Array<() => void> = [];
	private locked = false;

	/**
	 * Acquire the lock. Returns a release function.
	 * Usage:
	 * const release = await mutex.acquire();
	 * try { ... } finally { release(); }
	 */
	async acquire(): Promise<() => void> {
		if (this.locked) {
			await new Promise<void>((resolve) => this.queue.push(resolve));
		}
		this.locked = true;

		return () => {
			if (this.queue.length > 0) {
				const next = this.queue.shift()!;
				next();
			} else {
				this.locked = false;
			}
		};
	}

	/**
	 * Run an async function exclusively.
	 */
	async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
		const release = await this.acquire();
		try {
			return await fn();
		} finally {
			release();
		}
	}
}

// A global mutex for all file operations in the project.
export const writeMutex = new Mutex();
