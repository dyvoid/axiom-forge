/**
 * Domain error classes thrown by ProjectStore mutation methods.
 *
 * These carry *domain* meaning only — no HTTP status codes. The route layer
 * (routes/folios.ts) is responsible for mapping each type to a status code and
 * response body, keeping the store free of HTTP knowledge (ADR-0006).
 */

/** A folio failed structural (zod) or schema-conformance validation. */
export class ValidationError extends Error {
	constructor(
		public readonly code: 'invalid-shape' | 'schema-violation',
		public readonly issues: unknown,
	) {
		super(code);
		this.name = 'ValidationError';
	}
}

/** A request referenced a folio (or its file) that does not exist. */
export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NotFoundError';
	}
}

/** A request targeted a folder that maps to no schema type. */
export class BadRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BadRequestError';
	}
}

/** A save/create produced a title that sanitizes to an empty filename. */
export class InvalidTitleError extends Error {
	constructor() {
		super('invalid-title');
		this.name = 'InvalidTitleError';
	}
}

/**
 * A write could not proceed because of a collision: either the file changed on
 * disk since the client loaded it (`stale`), or the target filename is taken
 * (`exists`).
 */
export class ConflictError extends Error {
	constructor(
		public readonly detail:
			| { kind: 'stale'; serverMtime: number }
			| { kind: 'exists'; name: string },
	) {
		super(detail.kind);
		this.name = 'ConflictError';
	}
}

/** The on-disk rename failed after the in-place write had already succeeded. */
export class RenameFailedError extends Error {
	constructor(public readonly reason: string) {
		super('rename-failed');
		this.name = 'RenameFailedError';
	}
}

/**
 * The project-wide wikilink rewrite failed partway. The primary folio was
 * already renamed and re-indexed; only other files' links may be stale.
 */
export class LinkRewriteFailedError extends Error {
	constructor(
		public readonly reason: string,
		public readonly renamedTo: string,
	) {
		super('link-rewrite-failed');
		this.name = 'LinkRewriteFailedError';
	}
}
