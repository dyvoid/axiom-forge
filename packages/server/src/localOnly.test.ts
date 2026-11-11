import { describe, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { localOnly } from './localOnly.js';

function app() {
	const a = express();
	a.use(localOnly);
	a.all('/api/ping', (_req, res) => { res.json({ ok: true }); });
	return a;
}

describe('localOnly', () => {
	it.each(['127.0.0.1:3000', 'localhost:5273', 'localhost', '[::1]:3000', 'LOCALHOST:3000'])(
		'answers a request addressed to %s',
		async (host) => {
			await request(app()).get('/api/ping').set('Host', host).expect(200);
		},
	);

	// A rebound DNS name resolves to this machine but still names itself in Host.
	it.each(['evil.example', 'evil.example:3000', '127.0.0.1.evil.example', 'localhost.evil.example:3000'])(
		'refuses a request addressed to %s',
		async (host) => {
			await request(app()).get('/api/ping').set('Host', host).expect(403);
		},
	);

	it('allows the app\'s own origin, in dev and in production', async () => {
		await request(app()).post('/api/ping').set('Host', '127.0.0.1:3000').set('Origin', 'http://127.0.0.1:5273').expect(200);
		await request(app()).post('/api/ping').set('Host', 'localhost:3000').set('Origin', 'http://localhost:3000').expect(200);
	});

	it('refuses a cross-site origin, including the opaque "null"', async () => {
		await request(app()).post('/api/ping').set('Host', '127.0.0.1:3000').set('Origin', 'https://evil.example').expect(403);
		await request(app()).post('/api/ping').set('Host', '127.0.0.1:3000').set('Origin', 'null').expect(403);
	});
});
