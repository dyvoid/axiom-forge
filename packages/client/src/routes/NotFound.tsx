import { Link } from 'react-router-dom';

export function NotFound(): JSX.Element {
	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			height: '100vh',
			gap: '16px',
		}}>
			<h1 style={{
				fontFamily: 'var(--ff-body)',
				fontSize: 'var(--fs-h1)',
				fontWeight: 400,
				color: 'var(--text-primary)',
			}}>
				404
			</h1>
			<p style={{
				fontFamily: 'var(--ff-body)',
				fontSize: 'var(--fs-eyebrow)',
				letterSpacing: 'var(--ls-eyebrow)',
				textTransform: 'uppercase',
				color: 'var(--text-muted)',
			}}>
				Folio not found
			</p>
			<Link to="/" style={{
				fontFamily: 'var(--ff-body)',
				fontSize: 'var(--fs-eyebrow)',
				letterSpacing: 'var(--ls-button)',
				textTransform: 'uppercase',
				color: 'var(--accent-gold)',
				marginTop: '16px',
			}}>
				← Return to Index
			</Link>
		</div>
	);
}
