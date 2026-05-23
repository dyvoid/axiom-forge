import React, { type ReactNode } from 'react';
import { WikiLinkChip } from '../components/ui/WikiLinkChip.js';

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function parseFormatting(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
		.replace(/__(.+?)__/gs, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/gs, '<em>$1</em>')
		.replace(/_(.+?)_/gs, '<em>$1</em>')
		.replace(/`(.+?)`/g, '<code>$1</code>');
}

export function parseInline(text: string, keyPrefix: string = ''): ReactNode[] {
	const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
	const parts: ReactNode[] = [];
	let lastIndex = 0;
	let match;
	let i = 0;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(
				<span
					key={`${keyPrefix}-${i++}`}
					dangerouslySetInnerHTML={{
						__html: parseFormatting(text.substring(lastIndex, match.index)),
					}}
				/>
			);
		}

		const rawTarget = match[1];
		const alias = match[2];
		const folder = rawTarget.includes('/') ? rawTarget.split('/')[0] : 'Unsorted';
		const name = rawTarget.includes('/') ? rawTarget.split('/').slice(1).join('/') : rawTarget;

		parts.push(
			<WikiLinkChip
				key={`${keyPrefix}-${i++}`}
				link={{ folder, name: name.replace(/\s+/g, '_'), alias }}
			/>
		);
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < text.length) {
		parts.push(
			<span
				key={`${keyPrefix}-${i++}`}
				dangerouslySetInnerHTML={{ __html: parseFormatting(text.substring(lastIndex)) }}
			/>
		);
	}

	return parts;
}

function renderBlock(block: string, dropCap: boolean, blockKey: number): ReactNode {
	const lines = block.split('\n');
	const nodes: ReactNode[] = [];
	let paragraphLines: string[] = [];
	let listLines: string[] = [];
	let listType: 'ul' | 'ol' | null = null;
	let firstP = true;
	let idx = 0;

	function flushParagraph() {
		if (!paragraphLines.length) return;
		const cls = dropCap && firstP ? 'prose-drop-cap' : undefined;
		nodes.push(
			<p key={`p-${idx++}`} className={cls}>
				{paragraphLines.map((l, i) => (
					<React.Fragment key={i}>
						{i > 0 && <br />}
						{parseInline(l, `p-${idx}-${i}`)}
					</React.Fragment>
				))}
			</p>
		);
		firstP = false;
		paragraphLines = [];
	}

	function flushList() {
		if (!listLines.length) return;
		const tag = listType!;
		const strip = tag === 'ul' ? /^[-*] / : /^\d+\. /;

		const items = listLines.map((l, i) => (
			<li key={`li-${i}`}>{parseInline(l.replace(strip, ''), `li-${idx}-${i}`)}</li>
		));

		if (tag === 'ul') {
			nodes.push(<ul key={`ul-${idx++}`}>{items}</ul>);
		} else {
			nodes.push(<ol key={`ol-${idx++}`}>{items}</ol>);
		}

		listLines = [];
		listType = null;
	}

	for (const line of lines) {
		if (/^[-*] /.test(line)) {
			flushParagraph();
			if (listType === 'ol') flushList();
			listType = 'ul';
			listLines.push(line);
		} else if (/^\d+\. /.test(line)) {
			flushParagraph();
			if (listType === 'ul') flushList();
			listType = 'ol';
			listLines.push(line);
		} else {
			flushList();
			paragraphLines.push(line);
		}
	}

	flushParagraph();
	flushList();

	return <React.Fragment key={blockKey}>{nodes}</React.Fragment>;
}

export function renderMarkdown(content: string, dropCap = false): ReactNode {
	return (
		<React.Fragment>
			{content.split(/\n\n+/).map((block, i) => renderBlock(block.trim(), i === 0 && dropCap, i))}
		</React.Fragment>
	);
}
