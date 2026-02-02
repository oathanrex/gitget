/**
 * Formatting utility functions
 */
const Format = {
    /**
     * Format bytes to human readable size
     */
    fileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    /**
     * Format number with abbreviation
     */
    number(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    },

    /**
     * Format date to relative time
     */
    relativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
        return `${years} year${years > 1 ? 's' : ''} ago`;
    },

    /**
     * Format date to locale string
     */
    date(dateString, options = {}) {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        });
    },

    /**
     * Format date to ISO string (date only)
     */
    isoDate(dateString) {
        return new Date(dateString).toISOString().split('T')[0];
    },

    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength - suffix.length).trim() + suffix;
    },

    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Convert markdown-like text to HTML (basic)
     */
    basicMarkdown(text) {
        if (!text) return '';
        
        let html = this.escapeHtml(text);
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Plain URLs
        html = html.replace(
            /(^|[^"'])((https?:\/\/)[^\s<]+)/g,
            '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
        );
        
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    },

    /**
     * Slugify text
     */
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    },

    /**
     * Parse repository string
     */
    parseRepo(input) {
        const trimmed = input.trim();
        
        // Full GitHub URL
        const urlMatch = trimmed.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
        if (urlMatch) {
            return {
                owner: urlMatch[1],
                repo: urlMatch[2].replace(/\.git$/, '')
            };
        }
        
        // owner/repo format
        const repoMatch = trimmed.match(/^([^\/]+)\/([^\/]+)$/);
        if (repoMatch) {
            return {
                owner: repoMatch[1],
                repo: repoMatch[2]
            };
        }
        
        return null;
    }
};
