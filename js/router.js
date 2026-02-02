/**
 * Simple SPA Router
 */

const Router = (() => {
    'use strict';

    // State
    const routes = {};
    let currentRoute = null;

    // Recursion protection
    let isHandling = false;
    let redirectCount = 0;

    /**
     * Initialize router
     */
    function init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => handleRoute());

        // Handle initial route
        handleRoute();

        // Handle SPA redirect from 404.html (if hosted on GitHub Pages)
        const redirect = sessionStorage.getItem('spa_redirect');
        if (redirect) {
            sessionStorage.removeItem('spa_redirect');
            window.location.hash = redirect;
        }
    }

    /**
     * Register a route
     */
    function register(path, handler) {
        routes[path] = handler;
    }

    /**
     * Handle current route
     */
    function handleRoute() {
        // Prevent infinite recursion
        if (isHandling) {
            console.error('Recursive route handling detected');
            return;
        }

        isHandling = true;
        redirectCount++;

        // Max redirects check
        if (redirectCount > 5) {
            console.error('Maximum redirects exceeded');
            redirectCount = 0;
            isHandling = false;
            return;
        }

        try {
            let hash = window.location.hash.slice(1);
            if (!hash || hash === '') hash = '/';

            // Parse simple params
            // Support /app/owner/repo structure
            const parts = hash.split('/').filter(Boolean);
            let routePattern = hash;
            let routeParams = {};

            // Custom matching logic for specific known routes
            if ((parts[0] === 'app') && parts.length >= 3) {
                // /app/owner/repo
                routePattern = '/app/:owner/:repo';
                routeParams = {
                    owner: parts[1],
                    repo: parts[2]
                };
            } else if (parts[0] === 'library') {
                routePattern = '/library';
            } else if (parts.length === 0) {
                routePattern = '/';
            } else {
                // Fallback for sub-routes like /settings if added
                routePattern = '/' + parts[0];
            }

            // Hide all views first (accessibility)
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
                view.setAttribute('aria-hidden', 'true');
            });

            // Execute route handler
            const handler = routes[routePattern];
            if (handler) {
                handler(routeParams);
                currentRoute = routePattern;
            } else {
                console.warn(`Route not found: ${hash}, redirecting to home`);
                // Default to home
                if (routes['/']) {
                    routes['/']();
                }
                currentRoute = '/';
            }

            // Update navigation
            updateNav();

            // Scroll to top
            window.scrollTo(0, 0);

            // Reset redirect count after successful routing
            setTimeout(() => {
                redirectCount = 0;
            }, 100);
        } finally {
            isHandling = false;
        }
    }

    /**
     * Update navigation active state
     */
    function updateNav() {
        let navRoute = 'home';

        if (currentRoute === '/library') {
            navRoute = 'library';
        } else if (currentRoute && currentRoute.startsWith('/app')) {
            navRoute = 'home'; // App detail is part of home flow/search context usually
        }

        if (typeof Header !== 'undefined') {
            Header.setActiveNav(navRoute);
        }
    }

    /**
     * Navigate to a route
     */
    function navigate(path) {
        window.location.hash = path;
    }

    return Object.freeze({
        init,
        register,
        navigate
    });
})();
