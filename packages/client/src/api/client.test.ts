import { describe, expect, it } from 'vitest';
import { apiError } from './client.js';

describe('apiError', () => {
	it('reads a schema rejection as its issue messages', async () => {
		const res = new Response(
			JSON.stringify({
				error: 'schema-violation',
				issues: [{ message: 'Field "Notes" must be a single line.' }, { message: 'Second.' }],
			}),
			{ status: 400, statusText: 'Bad Request' },
		);
		const err = await apiError(res);
		expect(err.status).toBe(400);
		expect(err.message).toBe('Field "Notes" must be a single line. Second.');
	});

	it('keeps the status line and raw body for anything else', async () => {
		const err = await apiError(new Response('<html>oops</html>', { status: 500, statusText: 'Internal Server Error' }));
		expect(err.message).toBe('500 Internal Server Error: <html>oops</html>');
	});
});
