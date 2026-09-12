/**
 * Debug panel for the landing hero shader, opened with `/?tune`.
 *
 * Edits a live copy of `HeroParams` and keeps it in localStorage so a reload
 * (which also reseeds the smoke) doesn't lose the work. Nothing here changes
 * what ships: to adopt a look, copy the values and paste them over
 * `DEFAULT_HERO_PARAMS` in `heroParams.ts`.
 */

import { useEffect, useRef, useState } from 'react';
import controls from '../components/ui/controls.module.css';
import {
	DEFAULT_HERO_PARAMS,
	HERO_CONTROL_GROUPS,
	formatHeroParams,
	hexToVec3,
	isDefaultValue,
	sanitizeHeroParams,
	vec3ToHex,
	type HeroControl,
	type HeroParams,
	type Vec2,
} from './heroParams.js';
import styles from './HeroTuner.module.css';

const STORAGE_KEY = 'axiom-forge.hero-tuner';

type HeroTunerProps = {
	params: HeroParams;
	onChange: (params: HeroParams) => void;
	contentHidden: boolean;
	onContentHiddenChange: (hidden: boolean) => void;
};

const btn = `${controls.btn} ${controls.btnCompact} ${controls.btnSecondary}`;

export function HeroTuner({ params, onChange, contentHidden, onContentHiddenChange }: HeroTunerProps): JSX.Element {
	const [collapsed, setCollapsed] = useState(false);
	const [transfer, setTransfer] = useState<string | null>(null);
	const [status, setStatus] = useState('');
	const restored = useRef(false);

	// Restore once, then persist every change. The guard keeps the first save
	// (still holding the defaults) from overwriting what is being restored.
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) onChange(sanitizeHeroParams(JSON.parse(stored)));
		} catch {
			// Unreadable or blocked storage: start from the defaults.
		}
		restored.current = true;
	}, []); // restore once on mount

	useEffect(() => {
		if (!restored.current) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
		} catch {
			// Storage full or blocked; the panel still works for this session.
		}
	}, [params]);

	function set<K extends keyof HeroParams>(key: K, value: HeroParams[K]) {
		onChange({ ...params, [key]: value });
	}

	function reset(key: keyof HeroParams) {
		const fallback = DEFAULT_HERO_PARAMS[key];
		set(key, (Array.isArray(fallback) ? [...fallback] : fallback) as HeroParams[typeof key]);
	}

	async function copyValues() {
		const text = formatHeroParams(params);
		try {
			await navigator.clipboard.writeText(text);
			setStatus('Copied to clipboard');
		} catch {
			setTransfer(text);
			setStatus('Clipboard blocked — copy from the box');
		}
	}

	function applyTransfer() {
		try {
			onChange(sanitizeHeroParams(JSON.parse(transfer ?? '')));
			setTransfer(null);
			setStatus('Applied');
		} catch {
			setStatus('Not valid JSON');
		}
	}

	if (collapsed) {
		return (
			<button type="button" className={`${btn} ${styles.reopen}`} onClick={() => setCollapsed(false)}>
				Hero tuner
			</button>
		);
	}

	return (
		<aside className={styles.panel} aria-label="Hero tuner">
			<header className={styles.header}>
				<span className={styles.title}>Hero tuner</span>
				<button type="button" className={btn} onClick={() => setCollapsed(true)}>
					Hide
				</button>
			</header>

			<div className={styles.actions}>
				<button type="button" className={btn} onClick={() => void copyValues()}>
					Copy values
				</button>
				<button
					type="button"
					className={btn}
					onClick={() => setTransfer(transfer === null ? '' : null)}
					aria-expanded={transfer !== null}
				>
					Paste values
				</button>
				<button
					type="button"
					className={btn}
					onClick={() => {
						onChange(sanitizeHeroParams(null));
						setStatus('Reset to shipped values');
					}}
				>
					Reset all
				</button>
				<label className={styles.checkbox}>
					<input
						type="checkbox"
						checked={contentHidden}
						onChange={(e) => onContentHiddenChange(e.target.checked)}
					/>
					Hide page text
				</label>
			</div>

			{transfer !== null && (
				<div className={styles.transfer}>
					<textarea
						className={`${controls.fieldBox} ${styles.transferBox}`}
						aria-label="Values JSON"
						value={transfer}
						onChange={(e) => setTransfer(e.target.value)}
						placeholder="Paste a copied values blob"
						spellCheck={false}
					/>
					<button type="button" className={btn} onClick={applyTransfer}>
						Apply
					</button>
				</div>
			)}

			<p className={styles.status} role="status">
				{status}
			</p>

			<div className={styles.groups}>
				{HERO_CONTROL_GROUPS.map((group) => (
					<details key={group.title} className={styles.group} open>
						<summary className={styles.groupTitle}>{group.title}</summary>
						{group.controls.map((control) => (
							<ControlRow
								key={control.key}
								control={control}
								params={params}
								onSet={set}
								onReset={reset}
							/>
						))}
					</details>
				))}
			</div>
		</aside>
	);
}

type ControlRowProps = {
	control: HeroControl;
	params: HeroParams;
	onSet: <K extends keyof HeroParams>(key: K, value: HeroParams[K]) => void;
	onReset: (key: keyof HeroParams) => void;
};

function ControlRow({ control, params, onSet, onReset }: ControlRowProps): JSX.Element {
	const modified = !isDefaultValue(control.key, params[control.key]);

	return (
		<div className={styles.control}>
			<div className={styles.controlHead}>
				<span className={modified ? styles.labelModified : styles.label}>{control.label}</span>
				{modified && (
					<button
						type="button"
						className={styles.resetOne}
						onClick={() => onReset(control.key)}
						aria-label={`Reset ${control.label}`}
						title="Reset to shipped value"
					>
						↺
					</button>
				)}
			</div>

			{control.kind === 'range' && (
				<Slider
					label={control.label}
					value={params[control.key]}
					min={control.min}
					max={control.max}
					step={control.step}
					onChange={(n) => onSet(control.key, n)}
				/>
			)}

			{control.kind === 'range2' &&
				control.parts.map((part, i) => {
					const value = params[control.key];
					return (
						<Slider
							key={part}
							label={`${control.label} ${part}`}
							part={part}
							value={value[i]!}
							min={control.min}
							max={control.max}
							step={control.step}
							onChange={(n) => {
								const next: Vec2 = [...value];
								next[i] = n;
								onSet(control.key, next);
							}}
						/>
					);
				})}

			{control.kind === 'color' && (
				<div className={styles.colorRow}>
					<input
						type="color"
						className={styles.swatch}
						aria-label={control.label}
						value={vec3ToHex(params[control.key])}
						onChange={(e) => {
							const rgb = hexToVec3(e.target.value);
							if (rgb) onSet(control.key, rgb);
						}}
					/>
					<code className={styles.readout}>
						{vec3ToHex(params[control.key])} · {params[control.key].map((c) => c.toFixed(3)).join(', ')}
					</code>
				</div>
			)}

			{control.kind === 'choice' && (
				<select
					className={`${controls.fieldBox} ${styles.select}`}
					aria-label={control.label}
					value={params[control.key]}
					onChange={(e) => onSet(control.key, Number(e.target.value))}
				>
					{control.options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			)}

			{control.kind !== 'color' && control.hint && <p className={styles.hint}>{control.hint}</p>}
		</div>
	);
}

type SliderProps = {
	label: string;
	part?: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
};

function Slider({ label, part, value, min, max, step, onChange }: SliderProps): JSX.Element {
	return (
		<div className={styles.slider}>
			{part && <span className={styles.part}>{part}</span>}
			<input
				type="range"
				className={styles.range}
				aria-label={label}
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
			/>
			{/* The number box accepts values past the slider's range on purpose. */}
			<input
				type="number"
				className={styles.number}
				aria-label={`${label} value`}
				step={step}
				value={value}
				onChange={(e) => {
					const n = Number(e.target.value);
					if (e.target.value !== '' && Number.isFinite(n)) onChange(n);
				}}
			/>
		</div>
	);
}
