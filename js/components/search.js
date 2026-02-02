/**
 * Search Component
 * 
 * Handles repository search functionality and results display.
 */

const Search = (() => {
    'use strict';

    // Private DOM elements
    let form, input, btn, resultsContainer, resultsContent, resultsTitle, clearBtn;

    /**
     * Initialize search
     */
    function init() {
        form = document.getElementById('search-form');
        input = document.getElementById('search-input');
        btn = document.getElementById('search-btn');
        resultsContainer = document.getElementById('results-container');
        resultsContent = document.getElementById('results-content');
        resultsTitle = document.getElementById('results-title');
        clearBtn = document.getElementById('clear-results');

        if (!form) {
            console.warn('Search component: Form not found, skipping init');
            return;
        }

        setupEventListeners();
        setupHints();
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSearch();
        });

        clearBtn?.addEventListener('click', () => {
            clearResults();
        });
    }

    /**
     * Setup hint buttons
     */
    function setupHints() {
        document.querySelectorAll('.hint-btn').forEach(button => {
            button.addEventListener('click', () => {
                const repo = button.getAttribute('data-repo');
                if (input) {
                    input.value = repo;
                    handleSearch();
                }
            });
        });
    }

    // Rate limiting for search
    let lastSearchTime = 0;
    const SEARCH_COOLDOWN_MS = 500; // 500ms cooldown

    /**
     * Handle search
     */
    async function handleSearch() {
        if (!input) return;

        // Rate limiting check
        const now = Date.now();
        if (now - lastSearchTime < SEARCH_COOLDOWN_MS) {
            Toast.show('Please wait...', 'info');
            return;
        }
        lastSearchTime = now;

        const query = input.value.trim();
        if (!query) {
            Toast.show(ErrorMessages.GITHUB.EMPTY_INPUT, 'warning');
            return;
        }

        setLoading(true);

        try {
            // Validate input format
            const parsed = GitHubService.parseRepoInput(query);

            // Fetch app info
            const appInfo = await GitHubService.getAppInfo(parsed.owner, parsed.repo);

            showResults(appInfo, parsed);
        } catch (error) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    }

    /**
     * Show results
     */
    async function showResults(appInfo, parsed) {
        if (!resultsContainer || !resultsContent) return;

        // Get detection info for compatibility checking
        const detection = await DetectionService.detect();

        resultsTitle.textContent = `${parsed.owner}/${parsed.repo}`;
        resultsContent.innerHTML = '';

        if (!appInfo.hasRelease) {
            resultsContent.innerHTML = `
                <div class="no-results">
                    <span class="no-results-icon">📭</span>
                    <h3>No Releases Found</h3>
                    <p>${ErrorMessages.GITHUB.NO_RELEASES}</p>
                    <a href="https://github.com/${parsed.owner}/${parsed.repo}" 
                       target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                        View on GitHub
                    </a>
                </div>
            `;
        } else {
            // Render app card
            if (typeof AppCard !== 'undefined') {
                const card = AppCard.create(appInfo, detection);
                resultsContent.appendChild(card);
            }
        }

        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Clear results
     */
    function clearResults() {
        if (resultsContainer) {
            resultsContainer.classList.add('hidden');
        }
        if (resultsContent) {
            resultsContent.innerHTML = '';
        }
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    /**
     * Handle errors with centralized messages
     */
    function handleError(error) {
        console.error('Search error:', error);

        let message = ErrorMessages.UI.UNKNOWN_ERROR;

        if (error.name === 'NotFoundError') {
            message = ErrorMessages.GITHUB.NOT_FOUND;
        } else if (error.name === 'RateLimitError') {
            message = ErrorMessages.GITHUB.RATE_LIMIT(error.resetTime);
        } else if (error.name === 'NetworkError') {
            message = ErrorMessages.NETWORK.OFFLINE;
        } else if (error.message) {
            // Fallback to error message if present and safe
            message = error.message;
        }

        Toast.show(message, 'error');
    }

    /**
     * Set loading state
     */
    function setLoading(loading) {
        if (btn) {
            btn.disabled = loading;
            btn.classList.toggle('loading', loading);
            // Accessibility update
            btn.setAttribute('aria-busy', loading);
        }
        if (input) {
            input.disabled = loading;
        }
    }

    // Public API
    return Object.freeze({
        init,
        handleSearch,
        clearResults
    });
})();
