/**
 * Modal Component
 * 
 * Manages modal dialogs, overlay, and focus management.
 */

const Modal = (() => {
    'use strict';

    // State
    let overlay = null;
    let activeModal = null;
    let lastFocusedElement = null;

    /**
     * Initialize modal system
     */
    function init() {
        overlay = document.getElementById('modal-overlay');
        if (!overlay) return;

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAll();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen()) {
                closeAll();
            }
        });

        // Close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => closeAll());
        });
    }

    /**
     * Open a modal
     */
    function open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal || !overlay) return;

        // Save currently focused element to restore later
        lastFocusedElement = document.activeElement;

        closeAll(false); // Close other modals but don't reset state fully

        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');

        activeModal = modal;

        // Focus management: Focus first focusable element
        // Wait for potential transition
        setTimeout(() => {
            const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus();
            } else {
                modal.focus(); // Make modal itself focusable if needed (requires tabindex)
                if (!modal.hasAttribute('tabindex')) {
                    modal.setAttribute('tabindex', '-1');
                    modal.focus();
                }
            }
        }, 50);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close all modals
     * @param {boolean} restoreFocus - Whether to restore focus to previously focused element
     */
    function closeAll(restoreFocus = true) {
        if (!overlay) return;

        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');

        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            // Clean up temporary tabindex
            if (modal.getAttribute('tabindex') === '-1') {
                modal.removeAttribute('tabindex');
            }
        });

        activeModal = null;

        // Restore body scroll
        document.body.style.overflow = '';

        // Restore focus
        if (restoreFocus && lastFocusedElement && document.body.contains(lastFocusedElement)) {
            lastFocusedElement.focus();
        }
    }

    /**
     * Check if any modal is open
     */
    function isOpen() {
        return activeModal !== null;
    }

    // Public API
    return Object.freeze({
        init,
        open,
        closeAll,
        isOpen
    });
})();
