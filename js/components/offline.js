/**
 * Offline Detection and Handling component
 */

const Offline = (() => {
    'use strict';

    // State
    let isOnline = navigator.onLine;
    let banner = null;

    /**
     * Initialize offline detection
     */
    function init() {
        createBanner();
        bindEvents();
        updateStatus();
    }

    /**
     * Create offline banner
     */
    function createBanner() {
        banner = document.createElement('div');
        banner.className = 'offline-banner hidden';
        const icons = typeof Icons !== 'undefined' ? Icons : null;
        const iconHtml = icons ? icons.get('signal', 'icon-sm') : '📡';
        banner.innerHTML = `<span>${iconHtml}</span> <span>${ErrorMessages.NETWORK.OFFLINE || 'You are offline. Some features may be unavailable.'}</span>`;
        document.body.insertBefore(banner, document.body.firstChild);
    }

    /**
     * Bind online/offline events
     */
    function bindEvents() {
        window.addEventListener('online', () => {
            isOnline = true;
            updateStatus();
            if (typeof Toast !== 'undefined') Toast.show('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            isOnline = false;
            updateStatus();
            if (typeof Toast !== 'undefined') Toast.show('You are offline', 'warning');
        });
    }

    /**
     * Update UI status
     */
    function updateStatus() {
        if (banner) {
            banner.classList.toggle('hidden', isOnline);
            banner.setAttribute('aria-hidden', isOnline);
        }

        // Update API status dot
        const apiDot = document.querySelector('.api-dot');
        if (apiDot) {
            if (!isOnline) {
                apiDot.classList.add('error');
            } else {
                apiDot.classList.remove('error'); // This might be simplistic if API is actually down while online
                // Ideally API service manages this, but Offline is for connection status
            }
        }

        // Adjust main content padding when banner is shown
        const main = document.querySelector('.main');
        if (main) {
            main.style.paddingTop = isOnline
                ? `calc(var(--header-height) + var(--space-lg))`
                : `calc(var(--header-height) + 40px + var(--space-lg))`;
        }
    }

    /**
     * Check if online
     */
    function check() {
        return isOnline;
    }

    return Object.freeze({
        init,
        check
    });
})();
