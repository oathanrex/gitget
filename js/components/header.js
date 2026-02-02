/**
 * Header Component - Optimized & Secured Version
 * 
 * Improvements:
 * - Proper error handling with early returns
 * - Null checks before operations
 * - Event listener cleanup
 * - Better encapsulation
 * - Clear initialization state
 */

const Header = (() => {
    'use strict';

    // Private state
    let mobileMenuOpen = false;
    let initialized = false;
    let eventListeners = [];

    // Private DOM cache
    const dom = {
        menuBtn: null,
        nav: null,
        toggle: null,
        supportBtn: null
    };

    /**
     * Cache DOM elements
     * @private
     */
    function cacheDOMElements() {
        dom.menuBtn = document.getElementById('mobile-menu-btn');
        dom.nav = document.getElementById('nav');
        dom.toggle = document.getElementById('theme-toggle');
        dom.supportBtn = document.getElementById('support-btn');
    }

    /**
     * Add event listener and track for cleanup
     * @private
     */
    function addEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('Cannot add event listener to null element');
            return;
        }

        element.addEventListener(event, handler, options);
        eventListeners.push({ element, event, handler, options });
    }

    /**
     * Setup mobile menu
     * @private
     */
    function setupMobileMenu() {
        if (!dom.menuBtn || !dom.nav) {
            console.warn('Mobile menu elements not found - mobile menu disabled');
            return;
        }

        const toggleMenu = () => {
            mobileMenuOpen = !mobileMenuOpen;
            dom.nav.classList.toggle('open', mobileMenuOpen);
            dom.menuBtn.classList.toggle('active', mobileMenuOpen);

            // Update ARIA
            dom.menuBtn.setAttribute('aria-expanded', mobileMenuOpen);
        };

        addEventListener(dom.menuBtn, 'click', toggleMenu);

        // Close menu when clicking a link
        const navLinks = dom.nav.querySelectorAll('.nav-link');
        if (navLinks.length === 0) {
            console.warn('No navigation links found');
            return;
        }

        navLinks.forEach(link => {
            addEventListener(link, 'click', () => {
                mobileMenuOpen = false;
                dom.nav.classList.remove('open');
                dom.menuBtn.classList.remove('active');
                dom.menuBtn.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu on Escape key
        addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape' && mobileMenuOpen) {
                mobileMenuOpen = false;
                dom.nav.classList.remove('open');
                dom.menuBtn.classList.remove('active');
                dom.menuBtn.setAttribute('aria-expanded', 'false');
                dom.menuBtn.focus();
            }
        });
    }

    /**
     * Setup theme toggle
     * @private
     */
    function setupThemeToggle() {
        if (!dom.toggle) {
            console.warn('Theme toggle element not found - theme toggle disabled');
            return;
        }

        if (typeof StorageService === 'undefined') {
            console.error('StorageService not available - theme toggle disabled');
            return;
        }

        addEventListener(dom.toggle, 'click', () => {
            try {
                const current = StorageService.getTheme();
                const newTheme = current === 'dark' ? 'light' : 'dark';
                StorageService.setTheme(newTheme);
                applyTheme();
            } catch (error) {
                console.error('Error toggling theme:', error);
                if (typeof Toast !== 'undefined') {
                    Toast.show('Failed to change theme', 'error');
                }
            }
        });
    }

    /**
     * Apply current theme
     * @private
     */
    function applyTheme() {
        if (typeof StorageService === 'undefined') {
            console.error('StorageService not available');
            return;
        }

        try {
            const theme = StorageService.getTheme();
            document.documentElement.setAttribute('data-theme', theme);

            const icon = document.querySelector('.theme-icon');
            const icons = typeof Icons !== 'undefined' ? Icons : null;

            if (icon) {
                // If current theme is dark, show SUN icon (to switch to light)
                // If current theme is light, show MOON icon (to switch to dark)
                // Wait, typically the icon represents the CURRENT state or the ACTION?
                // Usually a toggle shows what you will switch TO, or the current state representation.
                // The original code was: theme === 'dark' ? '☀️' : '🌙';
                // This implies: If dark, show sun. If light, show moon.
                // So I'll replicate that.

                if (icons) {
                    icon.innerHTML = theme === 'dark' ? icons.get('sun', 'icon-md') : icons.get('moon', 'icon-md');
                } else {
                    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
                }

                // Update ARIA label
                const toggle = document.getElementById('theme-toggle');
                if (toggle) {
                    toggle.setAttribute('aria-label',
                        `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`
                    );
                }
            }
        } catch (error) {
            console.error('Error applying theme:', error);
        }
    }

    /**
     * Setup support button
     * @private
     */
    function setupSupportButton() {
        if (!dom.supportBtn) {
            console.warn('Support button not found - support button disabled');
            return;
        }

        if (typeof Modal === 'undefined') {
            console.error('Modal component not available - support button disabled');
            return;
        }

        addEventListener(dom.supportBtn, 'click', () => {
            try {
                Modal.open('support-modal');
            } catch (error) {
                console.error('Error opening support modal:', error);
            }
        });
    }

    /**
     * Update active nav link
     * @param {string} route - Route identifier
     */
    function setActiveNav(route) {
        if (!route) {
            console.warn('No route provided to setActiveNav');
            return;
        }

        const navLinks = document.querySelectorAll('.nav-link');
        if (navLinks.length === 0) {
            console.warn('No navigation links found');
            return;
        }

        navLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            const isActive = linkRoute === route;
            link.classList.toggle('active', isActive);
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    /**
     * Update update badge
     * @param {number} count - Number of updates
     */
    function updateBadge(count) {
        if (typeof count !== 'number' || count < 0) {
            console.warn('Invalid count provided to updateBadge:', count);
            return;
        }

        const badge = document.getElementById('update-badge');
        if (!badge) {
            console.warn('Update badge element not found');
            return;
        }

        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);

        // Update screen reader announcement
        badge.setAttribute('aria-label', `${count} updates available`);
    }

    /**
     * Render static icons
     * @private
     */
    function renderIcons() {
        if (typeof Icons === 'undefined') return;

        // Logo
        const logoIcon = document.querySelector('.logo-icon');
        if (logoIcon) logoIcon.innerHTML = Icons.get('package', 'icon-lg');

        // Nav Links
        const homeIcon = document.querySelector('[data-route="home"] .nav-icon');
        if (homeIcon) homeIcon.innerHTML = Icons.get('home', 'icon-md');

        const libIcon = document.querySelector('[data-route="library"] .nav-icon');
        if (libIcon) libIcon.innerHTML = Icons.get('grid', 'icon-md');

        // Support Button
        const supportIcon = document.querySelector('#support-btn span:first-child');
        if (supportIcon) supportIcon.innerHTML = Icons.get('star', 'icon-sm'); // Using star as cleaner fallback
    }

    /**
     * Initialize header
     */
    function init() {
        if (initialized) {
            console.warn('Header already initialized');
            return;
        }

        try {
            cacheDOMElements();
            renderIcons();
            setupMobileMenu();
            setupThemeToggle();
            setupSupportButton();
            applyTheme();

            initialized = true;
            console.log('Header initialized successfully');
        } catch (error) {
            console.error('Error initializing header:', error);
            throw error;
        }
    }

    /**
     * Cleanup event listeners (useful for testing or SPA unmount)
     */
    function destroy() {
        eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });

        eventListeners = [];
        initialized = false;

        console.log('Header destroyed');
    }

    // Public API
    return Object.freeze({
        init,
        destroy,
        setActiveNav,
        updateBadge,
        applyTheme  // Expose for external theme changes
    });
})();
