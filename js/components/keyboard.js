/**
 * Keyboard Shortcuts Handler component
 */

const Keyboard = (() => {
    'use strict';

    // State
    const shortcuts = new Map();
    let enabled = true;

    /**
     * Initialize keyboard shortcuts
     */
    function init() {
        document.addEventListener('keydown', handleKeydown);
        registerDefaultShortcuts();
        console.log('Keyboard shortcuts initialized');
    }

    /**
     * Handle keydown events
     */
    function handleKeydown(e) {
        // Skip if disabled or user is typing in an input
        if (!enabled) return;
        if (isTyping(e.target)) return;

        // Modal handling is typically done by the modal itself (it traps focus or handles escape)
        // But if we have global shortcuts, we might want to check
        if (typeof Modal !== 'undefined' && Modal.isOpen()) {
            // Only allow Escape if modal is open (handled by Modal component theoretically, but good fallback)
            // Or specific modal shortcuts? 
            // For now, prevent global shortcuts if modal is open, unless it's Escape
            if (e.key !== 'Escape') return;
        }

        const key = getKeyString(e);
        const handler = shortcuts.get(key);

        if (handler) {
            e.preventDefault();
            handler(e);
        }
    }

    /**
     * Check if user is typing in an input
     */
    function isTyping(target) {
        const tagName = target.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
    }

    /**
     * Get key string from event
     */
    function getKeyString(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        parts.push(e.key.toLowerCase());
        return parts.join('+');
    }

    /**
     * Register a shortcut
     */
    function register(key, handler, description = '') {
        shortcuts.set(key.toLowerCase(), handler);
    }

    /**
     * Unregister a shortcut
     */
    function unregister(key) {
        shortcuts.delete(key.toLowerCase());
    }

    /**
     * Register default shortcuts
     */
    function registerDefaultShortcuts() {
        // Focus search
        register('/', () => {
            const input = document.getElementById('search-input');
            if (input) {
                input.focus();
                input.select();
            }
        }, 'Focus search');

        // Go home
        register('h', () => {
            if (typeof Router !== 'undefined') Router.navigate('/');
        }, 'Go to home');

        // Go to library
        register('l', () => {
            if (typeof Router !== 'undefined') Router.navigate('/library');
        }, 'Go to library');

        // Toggle theme
        register('t', () => {
            if (typeof StorageService !== 'undefined' && typeof Header !== 'undefined') {
                const current = StorageService.getTheme();
                const newTheme = current === 'dark' ? 'light' : 'dark';
                StorageService.setTheme(newTheme);
                Header.applyTheme();
            }
        }, 'Toggle theme');

        // Show shortcuts help
        register('?', () => {
            showHelp();
        }, 'Show keyboard shortcuts');

        // Escape to clear/close
        register('escape', () => {
            if (typeof Modal !== 'undefined' && Modal.isOpen()) {
                Modal.closeAll();
            } else if (typeof Search !== 'undefined') {
                Search.clearResults();
            }
        }, 'Close modal / Clear search');
    }

    /**
     * Show keyboard shortcuts help
     */
    function showHelp() {
        if (typeof Toast !== 'undefined') {
            Toast.show('Keyboard Shortcuts: / (Search), H (Home), L (Library), T (Theme), ? (Help)', 'info', 4000);
        }
    }

    /**
     * Enable shortcuts
     */
    function enable() {
        enabled = true;
    }

    /**
     * Disable shortcuts
     */
    function disable() {
        enabled = false;
    }

    return Object.freeze({
        init,
        register,
        unregister,
        enable,
        disable
    });
})();
