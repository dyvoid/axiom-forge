import { useEffect, useState } from 'react';

type FetchState<T> =
	| { status: 'loading' }
	| { status: 'ok'; data: T }
	| { status: 'error'; message: string };

function useFetchJson<T>(url: string): FetchState<T> {
	const [state, setState] = useState<FetchState<T>>({ status: 'loading' });
	useEffect(() => {
		let cancelled = false;
		fetch(url)
			.then(async (r) => {
				if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
				return r.json() as Promise<T>;
			})
			.then((data) => {
				if (!cancelled) setState({ status: 'ok', data });
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setState({
						status: 'error',
						message: err instanceof Error ? err.message : String(err),
					});
				}
			});
		return () => {
			cancelled = true;
		};
	}, [url]);
	return state;
}

interface Config {
	name: string;
	description?: string;
}

export function App(): JSX.Element {
	const config = useFetchJson<Config>('/api/config');

	return (
		<main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 720 }}>
			<h1>Axiom Forge</h1>
			<p style={{ color: '#666' }}>Phase 0 scaffold — verifying client ↔ server.</p>
			<section>
				<h2>/api/config</h2>
				{config.status === 'loading' && <p>Loading…</p>}
				{config.status === 'error' && (
					<pre style={{ color: 'crimson' }}>Error: {config.message}</pre>
				)}
				{config.status === 'ok' && (
					<pre style={{ background: '#f5f0e2', padding: '1rem', borderRadius: 4 }}>
						{JSON.stringify(config.data, null, 2)}
					</pre>
				)}
			</section>
		</main>
	);
}
