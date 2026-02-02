/**
 * Toast Notification Component
 * 
 * Displays temporary notifications to the user.
 */

const Toast = (() => {
    'use strict';

    // Private state
    let container = null;

    // Constants from CONFIG or defaults
    const DURATION = (typeof CONFIG !== 'undefined' && CONFIG.UI && CONFIG.UI.TOAST_DURATION_MS) || 3000;

    // Icons
    const ICONS = {
        success: '✓',
        error: '✕',
        warning: '⚠️',
        info: 'ℹ️'
    };

    /**
     * Initialize the toast system
     */
    function init() {
        container = document.getElementById('toast-container');
        if (!container) {
            console.warn('Toast container not found');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms
     */
    function show(message, type = 'success', duration = DURATION) {
        if (!container) {
            // Lazy init if not already done
            container = document.getElementById('toast-container');
            if (!container) return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Sanitize message for basic security (though textContent is safer, innerHTML allows some formatting)
        // Here we'll use innerHTML structure but text content for message to prevent XSS

        toast.innerHTML = `
            <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
            <span class="toast-message"></span>
            <button class="toast-close" aria-label="Close notification">&times;</button>
        `;

        // Set text content safely
        const messageEl = toast.querySelector('.toast-message');
        if (messageEl) messageEl.textContent = message;

        container.appendChild(toast);

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                remove(toast);
            });
        }

        // Auto remove
        if (duration > 0) {
            setTimeout(() => remove(toast), duration);
        }
    }

    /**
     * Remove a toast element
     * @param {HTMLElement} toast 
     */
    function remove(toast) {
        if (!toast.parentNode) return;

        toast.style.animation = 'slideIn 0.3s ease reverse';

        // Use animationend event or timeout
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }

    // Public API
    return Object.freeze({
        init,
        show,
        remove
    });
})();
