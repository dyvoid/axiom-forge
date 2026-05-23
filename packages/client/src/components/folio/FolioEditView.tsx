import { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import {
	toRoman,
	type FieldDef,
	type FieldValue,
	type ParsedFolio,
	type ParsedSection,
	type SectionDef,
	type TypeDef,
} from '@axiom-forge/shared';
import { Icon } from '../ui/Icon.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { FieldEditor } from './edit/FieldEditor.js';
import { FieldTypeHint } from './edit/FieldTypeHint.js';
import { TextListField } from './edit/TextListField.js';
import { TextareaField } from './edit/TextareaField.js';
import { useFolios, useCreateFolio } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { collectUnresolvedLinks } from '../../utils/links.js';
import styles from './FolioEditView.module.css';

interface Props {
	folio: ParsedFolio & { id: number; mtime: number };
	typeDef: TypeDef;
	saving: boolean;
	deleting: boolean;
	saveError: string | null;
	onSave: (next: ParsedFolio) => void;
	onDelete: () => void;
}

export function FolioEditView({ folio, typeDef, saving, deleting, saveError, onSave, onDelete }: Props): JSX.Element {
	const navigate = useNavigate();
	// Local draft — initialised from server state, mutated on every keystroke.
	const [draft, setDraft] = useState<ParsedFolio>(() => structuredClone(folio));
	const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(folio));
	const [confirmDelete, setConfirmDelete] = useState(false);
	const { data: folios } = useFolios();
	const { schema } = useProject();
	const createStub = useCreateFolio({ navigateOnSuccess: false });
	const createAndEdit = useCreateFolio({ navigateOnSuccess: true });

	const dirty = JSON.stringify(draft) !== savedSnapshot;
	const unresolvedLinks = collectUnresolvedLinks(draft, folios);

	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			dirty && currentLocation.pathname !== nextLocation.pathname
	);

	useEffect(() => {
		if (blocker.state === 'blocked') {
			if (window.confirm('You have unsaved changes. Discard them and navigate?')) {
				blocker.proceed();
			} else {
				blocker.reset();
			}
		}
	}, [blocker]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.key === 'Escape' &&
				document.activeElement?.tagName !== 'INPUT' &&
				document.activeElement?.tagName !== 'TEXTAREA'
			) {
				e.preventDefault();
				navigate(`/folio/${folio.folder}/${folio.name}`);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [navigate, folio.folder, folio.name]);

	function patchSection(sectionName: string, patch: Partial<ParsedSection>): void {
		setDraft((d) => ({
			...d,
			sections: {
				...d.sections,
				[sectionName]: { ...(d.sections[sectionName] ?? {}), ...patch },
			},
		}));
	}

	function updateField(sectionName: string, fieldName: string, next: FieldValue): void {
		setDraft((d) => {
			const section = d.sections[sectionName] ?? {};
			return {
				...d,
				sections: {
					...d.sections,
					[sectionName]: {
						...section,
						fields: { ...(section.fields ?? {}), [fieldName]: next },
					},
				},
			};
		});
	}

	function handleSave(): void {
		onSave(draft);
		setSavedSnapshot(JSON.stringify(draft));
	}

	function handleDiscard(): void {
		navigate(backTo);
	}

	function handleCreateStub(folder: string, name: string): void {
		const entry = Object.entries(schema.types).find(([, def]) => def.folder === folder);
		if (!entry) return;
		createStub.mutate({
			folder,
			folio: { name, title: name.replace(/_/g, ' '), type: entry[0], folder, tags: [], sections: {} },
		});
	}

	function handleCreateAndEdit(folder: string, name: string): void {
		const entry = Object.entries(schema.types).find(([, def]) => def.folder === folder);
		if (!entry) return;
		createAndEdit.mutate({
			folder,
			folio: { name, title: name.replace(/_/g, ' '), type: entry[0], folder, tags: [], sections: {} },
		});
	}

	const backTo = `/folio/${encodeURIComponent(folio.folder)}/${encodeURIComponent(folio.name)}`;

	// Build the section list in schema declaration order.
	const sections = Object.entries(typeDef.sections);

	return (
		<div className={styles.container}>
			{/* Sticky toolbar */}
			<div className={styles.toolbar}>
				<button
					type="button"
					className={styles.btnGhost}
					onClick={() => setConfirmDelete(true)}
					disabled={saving || deleting}
				>
					Delete
				</button>
				<div className={styles.toolbarSpacer} />
				<button type="button" className={styles.btnGhost} onClick={handleDiscard} disabled={saving}>
					Discard
				</button>
				<button
					type="button"
					className={styles.btnPrimary}
					onClick={handleSave}
					disabled={saving || !dirty}
				>
					Save folio
				</button>
			</div>

			{saveError && (
				<div className={styles.warnings}>
					<div className={styles.warningsLabel}>Save failed</div>
					{saveError}
				</div>
			)}

			{unresolvedLinks.length > 0 && (
				<div className={`${styles.warnings} ${styles.brokenLinks}`}>
					<div className={styles.warningsLabel}>
						Unresolved wiki-links · {unresolvedLinks.length}
					</div>
					<ul className={styles.brokenLinksList}>
						{unresolvedLinks.map((u, i) => (
							<li key={i} className={styles.brokenLinkRow}>
								<div>
									{u.section}
									{u.field ? ` · ${u.field}` : ''}
									{' → '}
									<code>{u.folder}/{u.name}</code>
								</div>
								<div className={styles.stubActions}>
									<button
										type="button"
										className={styles.btnStub}
										onClick={() => handleCreateStub(u.folder, u.name)}
										disabled={createStub.isPending || createAndEdit.isPending}
									>
										Create
									</button>
									<button
										type="button"
										className={styles.btnStub}
										onClick={() => handleCreateAndEdit(u.folder, u.name)}
										disabled={createStub.isPending || createAndEdit.isPending}
									>
										Create & Edit
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			<ConfirmDialog
				open={confirmDelete}
				title="Delete folio"
				message={`Delete "${folio.title}"? This cannot be undone. The file will be removed from disk.`}
				confirmLabel="Delete folio"
				danger
				onCancel={() => setConfirmDelete(false)}
				onConfirm={() => {
					setConfirmDelete(false);
					onDelete();
				}}
			/>

			{/* Folio eyebrow */}
			<div className={styles.eyebrowRow}>
				<div className={styles.eyebrow}>
					<Icon name={typeDef.icon} size={14} />
					<span>·</span>
					<span>{folio.type}</span>
					<span>·</span>
					<span>Folio {toRoman(folio.id)}</span>
				</div>
			</div>

			{/* Editable title */}
			<input
				className={styles.titleInput}
				value={draft.title}
				onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
			/>

			{/* Tags row */}
			<div className={styles.metaRow}>
				<span className={styles.tagsLabel}>tags ·</span>
				<div className={styles.tagsSlot}>
					<TextListField
						value={draft.tags}
						onChange={(v) => setDraft((d) => ({ ...d, tags: v }))}
					/>
				</div>
			</div>

			<div className={styles.divider} />

			{/* Sections */}
			{sections.map(([sectionName, sectionDef], idx) => (
				<SectionBlock
					key={sectionName}
					ordinal={toRoman(idx + 1)}
					sectionName={sectionName}
					sectionDef={sectionDef}
					data={draft.sections[sectionName]}
					onUpdateField={(fieldName, next) => updateField(sectionName, fieldName, next)}
					onUpdateSection={(patch) => patchSection(sectionName, patch)}
				/>
			))}

			{/* Footer save row */}
			<div className={styles.dividerSoft} />
			<div className={styles.footer}>
				<span className={`${styles.footerStatus} ${dirty ? styles.dirty : ''}`}>
					{dirty
						? `· unsaved changes will write to ${folio.folder}/${folio.name}.md`
						: '· file in sync with disk'}
				</span>
				<button type="button" className={styles.btnGhost} onClick={handleDiscard} disabled={saving}>
					Discard
				</button>
				<button
					type="button"
					className={styles.btnPrimary}
					onClick={handleSave}
					disabled={saving || !dirty}
				>
					Save folio
				</button>
			</div>
		</div>
	);
}

// ── Section block ─────────────────────────────────────────────

interface SectionBlockProps {
	ordinal: string;
	sectionName: string;
	sectionDef: SectionDef;
	data: ParsedSection | undefined;
	onUpdateField: (fieldName: string, next: FieldValue) => void;
	onUpdateSection: (patch: Partial<ParsedSection>) => void;
}

function SectionBlock({
	ordinal,
	sectionName,
	sectionDef,
	data,
	onUpdateField,
	onUpdateSection,
}: SectionBlockProps): JSX.Element {
	const header = (
		<div className={styles.sectionHeader}>
			<span>{ordinal.toUpperCase()}. {sectionName}</span>
		</div>
	);

	// Section-level textarea (prose or plain textarea section)
	if (sectionDef.type === 'textarea') {
		const content = data?.content ?? '';
		const wordCount = content.split(/\s+/).filter(Boolean).length;
		return (
			<>
				{header}
				<div className={styles.sectionProse}>
					<TextareaField
						value={content}
						onChange={(v) => onUpdateSection({ content: v || undefined })}
					/>
					<div className={styles.proseFooter}>
						{wordCount} words · markdown · {sectionDef.role === 'prose' ? 'prose' : 'free text'}
					</div>
				</div>
			</>
		);
	}

	// Section-level wikilink-list (e.g. "Connected Events")
	if (sectionDef.type === 'wikilink-list') {
		const synthDef: FieldDef = { type: 'wikilink-list', target: sectionDef.target };
		return (
			<>
				{header}
				<div className={styles.section}>
					<FieldEditor
						fieldDef={synthDef}
						value={(data?.value as FieldValue) ?? null}
						onChange={(v) => onUpdateSection({ value: v })}
					/>
				</div>
			</>
		);
	}

	// Structured field section
	if (sectionDef.fields) {
		const fields = Object.entries(sectionDef.fields);
		return (
			<>
				{header}
				<div className={styles.section}>
					{fields.map(([fieldName, fieldDef]) => (
						<div key={fieldName} className={styles.fieldRow}>
							<div>
								<div className={styles.fieldLabel}>{fieldName}</div>
								<FieldTypeHint fieldDef={fieldDef} />
							</div>
							<div>
								<FieldEditor
									fieldDef={fieldDef}
									value={data?.fields?.[fieldName] ?? null}
									onChange={(v) => onUpdateField(fieldName, v)}
								/>
							</div>
						</div>
					))}
				</div>
			</>
		);
	}

	return <></>;
}
