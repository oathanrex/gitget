/**
 * GitGet - Main Application
 * 
 * Orchestrates the initialization and coordination of components.
 */

const App = (() => {
    'use strict';

    /**
     * Featured Apps Component
     * (Kept internal to App for now, could be extracted later)
     */
    const Featured = {
        // Featured apps list
        apps: [
            {
                owner: 'microsoft',
                repo: 'vscode',
                displayName: 'Visual Studio Code',
                description: 'Code editing. Redefined.',
                tags: ['editor', 'ide', 'development']
            },
            {
                owner: 'obsidianmd',
                repo: 'obsidian-releases',
                displayName: 'Obsidian',
                description: 'A powerful knowledge base that works on local Markdown files.',
                tags: ['notes', 'markdown', 'productivity']
            },
            {
                owner: 'bitwarden',
                repo: 'clients',
                displayName: 'Bitwarden',
                description: 'Open source password management solutions.',
                tags: ['security', 'passwords', 'encryption']
            },
            {
                owner: 'jgraph',
                repo: 'drawio-desktop',
                displayName: 'Draw.io Desktop',
                description: 'Official electron build of draw.io',
                tags: ['diagrams', 'design', 'productivity']
            },
            {
                owner: 'notable',
                repo: 'notable',
                displayName: 'Notable',
                description: 'The Markdown-based note-taking app that doesn\'t suck.',
                tags: ['notes', 'markdown', 'productivity']
            },
            {
                owner: 'marktext',
                repo: 'marktext',
                displayName: 'Mark Text',
                description: 'A simple and elegant markdown editor.',
                tags: ['markdown', 'editor', 'writing']
            }
        ],

        /**
         * Render featured apps with error handling
         */
        async render() {
            const grid = document.getElementById('featured-grid');
            if (!grid) return;

            grid.innerHTML = '<div class="loading">Loading featured apps...</div>';

            try {
                // Get system detection once
                const detection = await DetectionService.detect();

                // Fetch all apps in parallel dealing with failures gracefully
                const results = await Promise.allSettled(
                    this.apps.map(app =>
                        GitHubService.getAppInfo(app.owner, app.repo)
                            .then(appInfo => ({ app, appInfo, detection }))
                    )
                );

                grid.innerHTML = '';

                const successful = results.filter(r => r.status === 'fulfilled');
                const failed = results.filter(r => r.status === 'rejected');

                if (successful.length === 0 && failed.length > 0) {
                    throw new Error('All featured apps failed to load');
                }

                successful.forEach(({ value }) => {
                    // Only show apps that have releases
                    if (value.appInfo.hasRelease) {
                        // Use AppCard component if available
                        if (typeof AppCard !== 'undefined' && AppCard.create) {
                            const card = AppCard.create(value.appInfo, value.detection);
                            grid.appendChild(card);
                        } else {
                            // Fallback rendering
                            this.renderFallback(grid, value.appInfo, value.app);
                        }
                    } else {
                        console.warn(`No releases found for ${value.app.displayName}`);
                    }
                });

                if (failed.length > 0) {
                    console.warn(`Failed to load ${failed.length} featured apps`, failed);
                    // Could show partial error toast if needed
                }

            } catch (error) {
                console.error('Fatal error rendering featured apps:', error);

                // Determine user-friendly error message
                let userMessage = ErrorMessages.NETWORK.GENERIC;
                let isAuthError = false;

                if (error.name === 'RateLimitError') {
                    userMessage = `API Rate Limit Exceeded. Please wait until ${error.resetTime ? error.resetTime.toLocaleTimeString() : 'later'} or use a token.`;
                } else if (error.name === 'NetworkError') {
                    userMessage = 'Please check your internet connection.';
                } else if (error.name === 'APIError' && error.message.includes('Bad credentials')) {
                    userMessage = 'Invalid GitHub Token. Please check your settings.';
                    isAuthError = true;
                } else if (error.message) {
                    userMessage = error.message;
                }

                grid.innerHTML = `
                    <div class="error-message">
                        <span class="error-icon">⚠️</span>
                        <p>${userMessage}</p>
                        <div class="error-actions">
                            ${isAuthError ?
                        `<button id="btn-update-token" class="btn-primary">Update Token</button>` :
                        `<button id="btn-retry" class="btn-secondary">Retry</button>`
                    }
                            <button id="btn-reset" class="btn-text danger reset-btn-emergency">
                                ⚠️ Reset App Data (Fix Crash)
                            </button>
                        </div>
                    </div>
                `;

                // Add event listeners (CSP safe)
                setTimeout(() => {
                    const btnUpdate = document.getElementById('btn-update-token');
                    if (btnUpdate) {
                        btnUpdate.addEventListener('click', () => document.getElementById('open-settings').click());
                    }

                    const btnRetry = document.getElementById('btn-retry');
                    if (btnRetry) {
                        btnRetry.addEventListener('click', () => window.location.reload());
                    }

                    const btnReset = document.getElementById('btn-reset');
                    if (btnReset) {
                        btnReset.addEventListener('click', () => {
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.reload();
                        });
                    }
                }, 0);
            }
        },

        // Fallback renderer if AppCard.create is not available yet
        renderFallback(container, appInfo, meta) {
            const div = document.createElement('div');
            div.className = 'featured-card';
            div.innerHTML = `
                <h3>${meta.displayName}</h3>
                <p>${meta.description}</p>
            `;
            container.appendChild(div);
        }
    };

    /**
     * OS Selection Modal Component
     * (Kept internal for now)
     */
    const OSModal = {
        selectedOS: null,
        selectedArch: null,

        init() {
            this.setupTrigger();
            this.setupOptions();
            this.setupActions();
        },

        setupTrigger() {
            document.getElementById('detection-change')?.addEventListener('click', () => {
                this.open();
            });
        },

        async open() {
            try {
                const detection = await DetectionService.detect();
                this.selectedOS = detection.os;
                this.selectedArch = detection.arch;
                this.updateSelection();

                // Wait for DOM update before opening modal
                await new Promise(resolve => requestAnimationFrame(resolve));

                if (typeof Modal !== 'undefined') {
                    Modal.open('os-modal');
                }
            } catch (error) {
                console.error('Failed to open OS modal:', error);

                // Fallback to defaults
                this.selectedOS = 'windows';
                this.selectedArch = 'x64';
                this.updateSelection();

                if (typeof Modal !== 'undefined') {
                    Modal.open('os-modal');
                }

                if (typeof Toast !== 'undefined') {
                    Toast.show('Using default system detection', 'warning');
                }
            }
        },

        setupOptions() {
            // OS options
            document.querySelectorAll('.os-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectedOS = btn.dataset.os;
                    this.updateSelection();
                });
            });

            // Arch options
            document.querySelectorAll('.arch-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectedArch = btn.dataset.arch;
                    // Uncheck "show all" if specific arch selected
                    const showAllCheckbox = document.getElementById('show-all-arch');
                    if (showAllCheckbox) showAllCheckbox.checked = false;
                    this.updateSelection();
                });
            });

            // Show All Architectures checkbox
            let pendingDetection = null;
            document.getElementById('show-all-arch')?.addEventListener('change', async (e) => {
                // Cancel pending operation
                if (pendingDetection) {
                    pendingDetection.cancelled = true;
                }

                if (e.target.checked) {
                    this.selectedArch = 'all';  // Special value
                    // Deselect all arch buttons
                    document.querySelectorAll('.arch-option').forEach(btn => {
                        btn.classList.remove('selected');
                        btn.setAttribute('aria-pressed', 'false');
                    });
                } else {
                    // Create cancellable operation
                    pendingDetection = { cancelled: false };
                    const operation = pendingDetection;

                    try {
                        const detection = await DetectionService.detect();

                        // Check if still valid
                        if (!operation.cancelled) {
                            this.selectedArch = detection.arch;
                            this.updateSelection();
                        }
                    } catch (error) {
                        console.error('Failed to detect architecture:', error);
                        if (typeof Toast !== 'undefined') {
                            Toast.show('Detection failed, using x64', 'error');
                        }
                        this.selectedArch = 'x64';
                        this.updateSelection();
                    } finally {
                        if (pendingDetection === operation) {
                            pendingDetection = null;
                        }
                    }
                }
            });
        },

        setupActions() {
            // Reset
            document.getElementById('reset-detection')?.addEventListener('click', async () => {
                await DetectionService.clearOverride();
                await this.updateDetectionBadge();
                if (typeof Modal !== 'undefined') Modal.closeAll();
                if (typeof Toast !== 'undefined') Toast.show('Reset to auto-detect', 'success');
            });

            // Apply
            document.getElementById('apply-os-selection')?.addEventListener('click', async () => {
                // Validation - ensure both selections are made
                if (!this.selectedOS || !this.selectedArch) {
                    if (typeof Toast !== 'undefined') {
                        Toast.show('Please select both OS and architecture', 'error');
                    }
                    return;
                }

                DetectionService.setOverride(this.selectedOS, this.selectedArch);
                await this.updateDetectionBadge();
                if (typeof Modal !== 'undefined') Modal.closeAll();
                if (typeof Toast !== 'undefined') Toast.show('System selection updated', 'success');
            });
        },

        updateSelection() {
            // Update OS buttons
            document.querySelectorAll('.os-option').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.os === this.selectedOS);
                // Accessibility
                btn.setAttribute('aria-pressed', btn.dataset.os === this.selectedOS);
            });

            // Update arch buttons
            document.querySelectorAll('.arch-option').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.arch === this.selectedArch);
                btn.setAttribute('aria-pressed', btn.dataset.arch === this.selectedArch);
            });
        },

        async updateDetectionBadge() {
            const detection = await DetectionService.detect();
            const badge = document.getElementById('detection-text');
            const badgeContainer = document.getElementById('detection-badge');
            const icon = document.querySelector('.detection-icon');

            if (badge) {
                badge.textContent = detection.fullDisplay;
                if (detection.isOverride) {
                    badge.textContent += ' (manual)';
                }
            }

            // Add visual indicator for override mode
            if (badgeContainer) {
                badgeContainer.classList.toggle('override-active', detection.isOverride);
            }

            if (icon) {
                icon.innerHTML = detection.icon; // Use innerHTML for SVG
            }
        }
    };

    /**
     * Settings Modal Component
     */
    const SettingsModal = {
        init() {
            this.setupTrigger();
            this.setupActions();
        },

        setupTrigger() {
            document.getElementById('open-settings')?.addEventListener('click', () => {
                this.open();
            });
        },

        open() {
            this.updateTokenStatus();
            if (typeof Modal !== 'undefined') {
                Modal.open('settings-modal');
            }
        },

        updateTokenStatus() {
            const hasToken = GitHubService.hasToken();
            const inputWrapper = document.querySelector('.token-input-wrapper');
            const statusDiv = document.getElementById('token-status');
            const input = document.getElementById('github-token');

            if (hasToken) {
                inputWrapper?.classList.add('hidden');
                statusDiv?.classList.remove('hidden');
            } else {
                inputWrapper?.classList.remove('hidden');
                statusDiv?.classList.add('hidden');
                if (input) input.value = '';
            }
        },

        setupActions() {
            // Save Token
            document.getElementById('save-token')?.addEventListener('click', () => {
                const input = document.getElementById('github-token');
                const token = input?.value.trim();

                if (token) {
                    GitHubService.setToken(token);
                    this.updateTokenStatus();
                    if (typeof Toast !== 'undefined') {
                        Toast.show('Token saved! Reloading...', 'success');
                    }
                    // Force reload to apply changes immediately and clear any stuck states
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    if (typeof Toast !== 'undefined') {
                        Toast.show('Please enter a valid token', 'error');
                    }
                }
            });

            // Clear Token
            document.getElementById('clear-token')?.addEventListener('click', () => {
                GitHubService.setToken(null);
                this.updateTokenStatus();
                if (typeof Toast !== 'undefined') {
                    Toast.show('Token removed', 'info');
                }
            });

            // Clear Cache
            document.getElementById('clear-cache')?.addEventListener('click', () => {
                GitHubService.clearCache();
                if (typeof MatchingService !== 'undefined') {
                    MatchingService.clearCache();
                }
                if (typeof Toast !== 'undefined') {
                    Toast.show('App cache cleared', 'success');
                }
            });
        }
    };

    /**
     * Render static icons
     */
    function renderStaticIcons() {
        if (typeof Icons === 'undefined') return;

        // Search
        const searchIcon = document.querySelector('.search-icon');
        if (searchIcon) searchIcon.innerHTML = Icons.get('search', 'icon-lg');

        const searchBtnIcon = document.querySelector('.search-btn-icon');
        if (searchBtnIcon) searchBtnIcon.innerHTML = Icons.get('arrowRight', 'icon-md');

        // Modal OS Options
        const winIcon = document.querySelector('.os-option[data-os="windows"] .os-icon');
        if (winIcon) winIcon.innerHTML = Icons.get('windows', 'icon-lg');

        const macIcon = document.querySelector('.os-option[data-os="macos"] .os-icon');
        if (macIcon) macIcon.innerHTML = Icons.get('apple', 'icon-lg');

        const linuxIcon = document.querySelector('.os-option[data-os="linux"] .os-icon');
        if (linuxIcon) linuxIcon.innerHTML = Icons.get('linux', 'icon-lg');

        const androidIcon = document.querySelector('.os-option[data-os="android"] .os-icon');
        if (androidIcon) androidIcon.innerHTML = Icons.get('android', 'icon-lg');

        const iosIcon = document.querySelector('.os-option[data-os="ios"] .os-icon');
        if (iosIcon) iosIcon.innerHTML = Icons.get('mobile', 'icon-lg');

        // Empty States
        const libEmpty = document.querySelector('.library-empty .empty-icon');
        if (libEmpty) libEmpty.innerHTML = Icons.get('package', 'icon-xl');

        // Buttons & Alerts
        const exportBtn = document.querySelector('#export-library-btn span:first-child');
        if (exportBtn) exportBtn.innerHTML = Icons.get('upload', 'icon-sm');

        const importBtn = document.querySelector('#import-library-btn span:first-child');
        if (importBtn) importBtn.innerHTML = Icons.get('import', 'icon-sm');

        const warningIcon = document.querySelector('.warning-icon');
        if (warningIcon) warningIcon.innerHTML = Icons.get('alert', 'icon-md');

        // Nav Icons
        const settingsIcon = document.querySelector('.settings-btn .nav-icon');
        if (settingsIcon) settingsIcon.innerHTML = Icons.get('settings', 'icon-md'); // Assuming settings icon exists or fallback

        // Footer & Modals
        const footerStar = document.querySelector('.footer-links a[href*="github"] span');
        if (footerStar) footerStar.innerHTML = Icons.get('star', 'icon-sm');

        const footerCoffee = document.querySelector('.footer-links a[href*="coffee"] span');
        if (footerCoffee) footerCoffee.innerHTML = Icons.get('heart', 'icon-sm');

        const modalCoffee = document.querySelector('.bmc-icon');
        if (modalCoffee) modalCoffee.innerHTML = Icons.get('heart', 'icon-md');

        // Detection Badge Initial
        const detectionIcon = document.querySelector('.detection-icon');
        if (detectionIcon) detectionIcon.innerHTML = Icons.get('monitor', 'icon-lg');
    }

    /**
     * Initialize Application
     */
    async function init() {
        console.log('Initializing GitGet...');

        try {
            renderStaticIcons();

            // Initialize components
            // Check existence before init to be safe
            if (typeof Toast !== 'undefined') Toast.init();
            if (typeof Modal !== 'undefined') Modal.init();
            if (typeof Header !== 'undefined') Header.init();
            if (typeof Search !== 'undefined') Search.init();
            if (typeof Library !== 'undefined') Library.init();
            if (typeof Offline !== 'undefined') Offline.init();
            if (typeof Keyboard !== 'undefined') Keyboard.init();

            OSModal.init();
            SettingsModal.init();

            // Setup routes
            setupRoutes();

            // Initialize router
            if (typeof Router !== 'undefined') Router.init();

            // Load featured apps
            await Featured.render();

            // Update detection badge
            await OSModal.updateDetectionBadge();

            // Check for updates in library
            checkLibraryUpdates();

            console.log('GitGet initialized successfully');

        } catch (error) {
            console.error('Initialization failed:', error);
            // Emergency fallback UI could go here
        }
    }

    function setupRoutes() {
        if (typeof Router === 'undefined') return;

        // Home route
        Router.register('/', () => {
            setActiveView('view-home');
            // Re-render featured if empty (optional optimization)
        });

        // Library route
        Router.register('/library', () => {
            setActiveView('view-library');
            if (typeof Library !== 'undefined') Library.render();
        });

        // App detail route
        Router.register('/app/:owner/:repo', (params) => {
            setActiveView('view-detail');
            if (typeof AppDetail !== 'undefined') {
                AppDetail.render(params.owner, params.repo);
            }
        });
    }

    function setActiveView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
            view.setAttribute('aria-hidden', 'true');
        });

        // Show target view
        const view = document.getElementById(viewId);
        if (view) {
            view.classList.add('active');
            view.setAttribute('aria-hidden', 'false');
            window.scrollTo(0, 0);
        }
    }

    function checkLibraryUpdates() {
        if (typeof StorageService === 'undefined' || typeof Header === 'undefined') return;

        try {
            const library = StorageService.getLibrary();
            if (library && Array.isArray(library.apps)) {
                const updatesCount = library.apps.filter(a => a.hasUpdate).length;
                Header.updateBadge(updatesCount);
            }
        } catch (error) {
            console.warn('Failed to check library updates:', error);
        }
    }

    // Public API
    return Object.freeze({
        init
    });
})();

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
