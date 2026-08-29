/**
 * Converts LeetCode problem description HTML to Markdown.
 *
 * LeetCode descriptions use a predictable subset of HTML:
 * - <p>, <strong>, <em>, <code>, <pre>
 * - <ul>/<ol> with <li>
 * - <sup>, <sub>
 * - HTML entities
 *
 * We use targeted conversion rather than a full HTML parser to keep
 * the plugin dependency-free (Obsidian plugins should minimize deps).
 */
export function htmlToMarkdown(html: string): string {
	if (!html) return "";

	let md = html;

	// Normalize line endings
	md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	// Remove <style> and <script> blocks
	md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
	md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

	// Convert <pre> blocks (preserve content, wrap in code fences)
	md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_: string, content: string): string => {
		// Strip inner tags but keep text
		const text = stripTags(content).trim();
		return `\n\`\`\`\n${text}\n\`\`\`\n`;
	});

	// Convert <code> to inline code
	md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_: string, content: string): string => {
		const text = stripTags(content).trim();
		return `\`${text}\``;
	});

	// Convert headings
	md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_: string, c: string): string => `\n# ${stripTags(c).trim()}\n`);
	md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_: string, c: string): string => `\n## ${stripTags(c).trim()}\n`);
	md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_: string, c: string): string => `\n### ${stripTags(c).trim()}\n`);

	// Convert <strong> / <b> to bold
	md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");

	// Convert <em> / <i> to italic
	md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");

	// Convert <sup> / <sub>
	md = md.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, "^$1^");
	md = md.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, "~$1~");

	// Convert <a href="...">text</a> to [text](url)
	md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_: string, url: string, text: string): string => {
		return `[${stripTags(text).trim()}](${url})`;
	});

	// Convert <img> to ![alt](src)
	md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
	md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");

	// Convert ordered lists
	md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_: string, content: string): string => {
		let counter = 1;
		const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, item: string): string => {
			return `${counter++}. ${stripTags(item).trim()}\n`;
		});
		return `\n${stripTags(items, true)}\n`;
	});

	// Convert unordered lists
	md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_: string, content: string): string => {
		const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, item: string): string => {
			return `- ${stripTags(item).trim()}\n`;
		});
		return `\n${stripTags(items, true)}\n`;
	});

	// Convert <br> / <br/> to newlines
	md = md.replace(/<br\s*\/?>/gi, "\n");

	// Convert <p> to double newline
	md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_: string, content: string): string => {
		return `\n${content.trim()}\n`;
	});

	// Convert <hr> to horizontal rule
	md = md.replace(/<hr\s*\/?>/gi, "\n---\n");

	// Strip remaining HTML tags
	md = stripTags(md);

	// Decode common HTML entities
	md = decodeEntities(md);

	// Clean up excessive whitespace
	md = md.replace(/\n{3,}/g, "\n\n");
	md = md.trim();

	return md;
}

/**
 * Strips HTML tags from a string.
 * If preserveNewlines is true, replaces block-level tags with newlines first.
 */
function stripTags(html: string, preserveNewlines = false): string {
	if (preserveNewlines) {
		html = html.replace(/<\/(?:p|div|li|tr|br)[^>]*>/gi, "\n");
	}
	return html.replace(/<[^>]+>/g, "");
}

/**
 * Decodes common HTML entities.
 */
function decodeEntities(text: string): string {
	const entities: Record<string, string> = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&quot;": '"',
		"&#39;": "'",
		"&apos;": "'",
		"&nbsp;": " ",
		"&ndash;": "–",
		"&mdash;": "—",
		"&laquo;": "«",
		"&raquo;": "»",
		"&hellip;": "…",
		"&times;": "×",
		"&divide;": "÷",
		"&le;": "≤",
		"&ge;": "≥",
		"&ne;": "≠",
		"&infin;": "∞",
	};

	let result = text;
	for (const [entity, char] of Object.entries(entities)) {
		result = result.replace(new RegExp(entity, "g"), char);
	}

	// Handle numeric entities: &#123; and &#x1A;
	result = result.replace(/&#(\d+);/g, (_: string, num: string): string => String.fromCharCode(parseInt(num, 10)));
	result = result.replace(/&#x([0-9a-fA-F]+);/g, (_: string, hex: string): string => String.fromCharCode(parseInt(hex, 16)));

	return result;
}

