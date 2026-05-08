/**
 * Renders markdown content (prose fields) to an HTML string.
 * Handles block-level lists and paragraphs, plus inline formatting within each.
 */

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function renderInline(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
		.replace(/__(.+?)__/gs, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/gs, '<em>$1</em>')
		.replace(/_(.+?)_/gs, '<em>$1</em>')
		.replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderBlock(block: string, dropCap: boolean): string {
	const lines = block.split('\n');
	let html = '';
	let paragraphLines: string[] = [];
	let listLines: string[] = [];
	let listType: 'ul' | 'ol' | null = null;
	let firstP = true;

	function flushParagraph() {
		if (!paragraphLines.length) return;
		const cls = dropCap && firstP ? ' class="prose-drop-cap"' : '';
		html += `<p${cls}>${paragraphLines.map(renderInline).join('<br>')}</p>`;
		firstP = false;
		paragraphLines = [];
	}

	function flushList() {
		if (!listLines.length) return;
		const tag = listType!;
		const strip = tag === 'ul' ? /^[-*] / : /^\d+\. /;
		const items = listLines.map(l => `<li>${renderInline(l.replace(strip, ''))}</li>`).join('');
		html += `<${tag}>${items}</${tag}>`;
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

	return html;
}

export function renderMarkdown(content: string, dropCap = false): string {
	return content
		.split(/\n\n+/)
		.map((block, i) => renderBlock(block.trim(), i === 0 && dropCap))
		.join('');
}
