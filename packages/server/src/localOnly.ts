/**
 * Request guard for a server that is only ever meant to be reached from the
 * machine it runs on.
 *
 * Binding to 127.0.0.1 keeps other machines out, but not other *websites*: a
 * page open in the user's browser can still send requests here. Two checks
 * close that door.
 *
 * - **Host.** With DNS rebinding a hostile site points its own domain at
 *   127.0.0.1, after which the browser treats this API as same-origin with it
 *   and lets it read and write freely. Such a request still carries the
 *   attacker's hostname in `Host`, so anything not addressed to a loopback
 *   name is refused.
 * - **Origin.** A cross-site form post or `fetch` that needs no CORS preflight
 *   (a bodiless `POST /api/reload`, say) would otherwise go through. Browsers
 *   attach `Origin` to those; a non-loopback one is refused. Requests without
 *   the header — same-origin GETs, curl, tests — pass.
 */

import type { NextFunction, Request, Response } from 'express';

const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The hostname of a `Host` header value: `localhost:3000` → `localhost`, `[::1]:3000` → `[::1]`. */
function hostnameOf(host: string): string {
	return host.replace(/:\d+$/, '').toLowerCase();
}

function isLoopbackOrigin(origin: string): boolean {
	try {
		return LOOPBACK_HOSTS.has(new URL(origin).hostname.toLowerCase());
	} catch {
		return false; // "null", or anything else that is not a URL
	}
}

export function localOnly(req: Request, res: Response, next: NextFunction): void {
	const host = req.headers.host;
	if (!host || !LOOPBACK_HOSTS.has(hostnameOf(host))) {
		res.status(403).json({ error: 'This server only answers requests addressed to localhost.' });
		return;
	}
	const origin = req.headers.origin;
	if (origin !== undefined && !isLoopbackOrigin(origin)) {
		res.status(403).json({ error: 'Cross-site requests are not allowed.' });
		return;
	}
	next();
}
