/**
 * Markdown Parsing Web Worker
 * 
 * Offloads markdown parsing to a background thread to keep the UI responsive.
 * Enhanced with XSS protection and strict URL validation.
 */

// Constants for URL validation
const SAFE_URL_PATTERN = /^https?:\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(:[0-9]{1,5})?(\/[^\s]*)?$/i;
const MAX_URL_LENGTH = 2048;
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];

/**
 * Sanitize URL to prevent XSS attacks
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or '#' if invalid
 */
function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';

    // Trim and check length
    const trimmed = url.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) return '#';

    // Check for dangerous protocols
    const lowerUrl = trimmed.toLowerCase();
    for (const protocol of DANGEROUS_PROTOCOLS) {
        if (lowerUrl.startsWith(protocol)) {
            return '#';
        }
    }

    // Validate against safe pattern
    if (!SAFE_URL_PATTERN.test(trimmed)) return '#';

    return trimmed;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

self.onmessage = function (e) {
    // Check if data is object with id (new protocol) or just string (legacy/direct)
    const data = e.data;
    let text = '';
    let id = null;

    if (data && typeof data === 'object' && data.text) {
        text = data.text;
        id = data.id;
    } else {
        text = data;
    }

    const html = parseMarkdown(text);

    // Return object if id was provided, otherwise just html
    if (id) {
        self.postMessage({ id, html });
    } else {
        self.postMessage(html);
    }
};

/**
 * Simple Markdown Parser
 * @param {string} text - Markdown text
 * @returns {string} HTML
 */
function parseMarkdown(text) {
    if (!text) return '';

    // Escape HTML first to prevent XSS
    let html = escapeHtml(text);

    // Headers (h1-h6)
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

    // Code blocks (fenced)
    html = html.replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Lists (Unordered) - simple implementation
    // formatting: - item -> <li>item</li>. Then wrap adjacent lis in ul.
    // This simple regex won't handle nested lists well but serves basic update notes.
    html = html.replace(/^\s*[\-\*] (.*$)/gim, '<li>$1</li>');

    // Wrap <li> elements in <ul> (heuristic: if line starts with <li>)
    // We can't easily do stateful parsing with simple regex replacement on the whole string.
    // So we'll accept that <ul> might be missing or we wrap the whole thing.
    // Better approach: Split by lines, process, then join.

    // Links [text](url) - With strict URL validation and sanitization
    html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/gim,
        function (match, linkText, url) {
            const safeUrl = sanitizeUrl(url);
            // Link text is already escaped from initial escapeHtml
            if (safeUrl === '#') {
                return linkText; // Return plain text if URL is invalid
            }
            return '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a>';
        }
    );

    // Auto-link URLs - With strict validation
    html = html.replace(
        /(^|[^\/"'>])(https?:\/\/[^\s<]+)/gim,
        function (match, prefix, url) {
            const safeUrl = sanitizeUrl(url);
            if (safeUrl === '#') {
                return prefix + url; // Return as plain text if invalid
            }
            return prefix + '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
        }
    );

    // Newlines to <br> (but not inside pre/code tags usually, but here simple)
    // We'll replace newlines with <br> only if they are not around block elements
    html = html.replace(/\n/g, '<br>');

    // Cleanup multiple <br>s
    html = html.replace(/(<br>){3,}/g, '<br><br>');

    return html;
}
