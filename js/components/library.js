/**
 * Library Component
 * 
 * Manages the user's library of saved applications.
 */

const Library = (() => {
    'use strict';

    // State
    let currentFilter = 'all';

    /**
     * Initialize library
     */
    function init() {
        setupFilters();
        setupActions();
    }

    /**
     * Setup filter buttons
     */
    function setupFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                render();
            });
        });
    }

    /**
     * Setup action buttons
     */
    function setupActions() {
        // Check updates
        document.getElementById('check-updates-btn')?.addEventListener('click', () => {
            checkUpdates();
        });

        // Export
        document.getElementById('export-library-btn')?.addEventListener('click', () => {
            exportLibrary();
        });

        // Import
        document.getElementById('import-library-btn')?.addEventListener('click', () => {
            if (typeof Modal !== 'undefined') {
                Modal.open('import-modal');
            }
        });

        // Confirm import
        document.getElementById('confirm-import')?.addEventListener('click', () => {
            importLibrary();
        });
    }

    /**
     * Render library
     */
    /**
     * Render library
     */
    async function render() {
        const library = StorageService.getLibrary();
        const emptyEl = document.getElementById('library-empty');
        const listEl = document.getElementById('library-list');
        const statTotal = document.getElementById('stat-total');
        const statUpdates = document.getElementById('stat-updates');

        if (!listEl) return;

        // Update stats
        const updatesCount = library.apps.filter(a => a.hasUpdate).length;
        if (statTotal) statTotal.textContent = library.apps.length;
        if (statUpdates) statUpdates.textContent = updatesCount;

        // Update header badge
        if (typeof Header !== 'undefined') {
            Header.updateBadge(updatesCount);
        }

        // Filter apps
        let apps = library.apps;
        if (currentFilter === 'updates') {
            apps = apps.filter(a => a.hasUpdate);
        }

        if (apps.length === 0) {
            emptyEl?.classList.remove('hidden');
            listEl.classList.add('hidden');
            listEl.innerHTML = '';
            return;
        }

        emptyEl?.classList.add('hidden');
        listEl.classList.remove('hidden');

        // Efficient Rendering using DocumentFragment
        const fragment = document.createDocumentFragment();
        apps.forEach(app => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = createLibraryItemHTML(app);
            fragment.appendChild(tempDiv.firstElementChild);
        });

        listEl.innerHTML = '';
        listEl.appendChild(fragment);

        // Setup item events
        setupItemEvents(listEl);
    }

    /**
     * Efficiently update a single item in the list
     */
    function updateItem(app) {
        const listEl = document.getElementById('library-list');
        if (!listEl) return;

        const existingItem = listEl.querySelector(`.library-item[data-app="${app.owner}/${app.repo}"]`);
        if (existingItem) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = createLibraryItemHTML(app);
            const newItem = tempDiv.firstElementChild;

            // Re-bind events for the new item
            setupSingleItemEvents(newItem);

            existingItem.replaceWith(newItem);
        }
    }

    /**
     * Create library item HTML
     */
    function createLibraryItemHTML(app) {
        // Safe escaping if AppCard is available, otherwise basic escape
        const escapeHtml = (typeof AppCard !== 'undefined' && AppCard.escapeHtml)
            ? AppCard.escapeHtml
            : (str) => str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

        const icons = typeof Icons !== 'undefined' ? Icons : null;

        return `
            <div class="library-item ${app.hasUpdate ? 'has-update' : ''}" data-app="${app.owner}/${app.repo}">
                <div class="library-item-icon" aria-hidden="true">${icons ? icons.get('package', 'icon-md') : '📦'}</div>
                <div class="library-item-info">
                    <div class="library-item-name">${escapeHtml(app.displayName)}</div>
                    <div class="library-item-repo">${app.owner}/${app.repo}</div>
                    <div class="library-item-version">
                        <span class="version-current">v${app.savedVersion || 'unknown'}</span>
                        ${app.hasUpdate ? `
                            <span class="version-arrow">${icons ? icons.get('arrowRight', 'icon-sm') : '→'}</span>
                            <span class="version-new">v${app.latestVersion}</span>
                            <span class="update-badge">Update Available</span>
                        ` : ''}
                    </div>
                </div>
                <div class="library-item-actions">
                    ${app.hasUpdate ? `
                        <a href="https://github.com/${app.owner}/${app.repo}/releases/latest" 
                           target="_blank" rel="noopener noreferrer" 
                           class="btn btn-primary" aria-label="Update ${escapeHtml(app.displayName)}">
                            ${icons ? icons.get('download', 'icon-sm') : ''} Update
                        </a>
                    ` : ''}
                    <a href="#/app/${app.owner}/${app.repo}" class="btn btn-secondary" aria-label="View ${escapeHtml(app.displayName)}">View</a>
                    <button class="btn btn-secondary remove-btn" data-owner="${app.owner}" data-repo="${app.repo}" aria-label="Remove ${escapeHtml(app.displayName)}">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    // ... (unchanged code) ...

    /**
     * Check for updates
     * Uses batching to prevent rate limiting and optimized storage I/O
     */
    async function checkUpdates() {
        // ... (unchanged logic) ...

        const btn = document.getElementById('check-updates-btn');
        const icons = typeof Icons !== 'undefined' ? Icons : null;

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px"></span> Checking...';
        }

        // ... (unchanged logic) ...

        // (End of function)
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>${icons ? icons.get('refresh', 'icon-sm') : '🔄'}</span><span>Check Updates</span>`;
        }

        // ...
    }

    /**
     * Setup item event listeners (bulk)
     */
    function setupItemEvents(container) {
        container.querySelectorAll('.library-item').forEach(item => {
            setupSingleItemEvents(item);
        });
    }

    /**
     * Setup events for a single item
     */
    function setupSingleItemEvents(item) {
        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                const { owner, repo } = removeBtn.dataset;
                StorageService.removeApp(owner, repo);
                Toast.show('Removed from library', 'success');
                // Remove from DOM immediately
                item.remove();
                // Update stats and empty state check
                const library = StorageService.getLibrary();
                const updatesCount = library.apps.filter(a => a.hasUpdate).length;
                if (typeof Header !== 'undefined') Header.updateBadge(updatesCount);
                if (library.apps.length === 0) render(); // Re-render if empty to show empty state
            });
        }
    }

    /**
     * Check for updates
     * Uses batching to prevent rate limiting
     */

    // State for race condition protection
    let updateInProgress = false;

    /**
     * Check for updates
     * Uses batching to prevent rate limiting and optimized storage I/O
     */
    async function checkUpdates() {
        // Prevent concurrent update checks (race condition protection)
        if (updateInProgress) {
            Toast.show('Update check already in progress', 'warning');
            return;
        }

        updateInProgress = true;

        try {
            // Read library once and clone to prevent race conditions
            const library = StorageService.getLibrary();
            if (library.apps.length === 0) {
                Toast.show(ErrorMessages.STORAGE.NOT_FOUND, 'warning');
                return;
            }

            // Clone apps array to avoid issues if user modifies library during check
            const appsSnapshot = [...library.apps];

            const btn = document.getElementById('check-updates-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px"></span> Checking...';
            }

            let updatesFound = 0;
            let errors = 0;
            let libraryModified = false;

            // Use batching from CONFIG
            const BATCH_SIZE = CONFIG.LIBRARY_UPDATES ? CONFIG.LIBRARY_UPDATES.BATCH_SIZE : 3;
            const BATCH_DELAY = CONFIG.LIBRARY_UPDATES ? CONFIG.LIBRARY_UPDATES.BATCH_DELAY_MS : 1000;

            // Process apps in batches
            for (let i = 0; i < library.apps.length; i += BATCH_SIZE) {
                const batch = library.apps.slice(i, i + BATCH_SIZE);

                // Process batch in parallel
                const results = await Promise.allSettled(batch.map(async (app) => {
                    const release = await GitHubService.getLatestRelease(app.owner, app.repo);
                    const latestVersion = release.tag_name.replace(/^v/i, '');
                    const savedVersion = app.savedVersion?.replace(/^v/i, '');

                    return {
                        app,
                        release,
                        hasUpdate: latestVersion !== savedVersion
                    };
                }));

                // Handle results
                results.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        const { app, release, hasUpdate } = result.value;

                        // Update app object in memory (reference in 'library')
                        app.latestVersion = release.tag_name;
                        app.lastChecked = new Date().toISOString();
                        app.hasUpdate = hasUpdate;

                        libraryModified = true;

                        // Update UI for this item immediately
                        updateItem(app);

                        if (hasUpdate) updatesFound++;
                    } else {
                        console.error(`Error checking update for one app:`, result.reason);
                        errors++;
                    }
                });

                // Save library state to storage safely (Merge with fresh data to avoid race conditions)
                if (libraryModified) {
                    try {
                        const freshLibrary = StorageService.getLibrary();
                        let changesApplied = false;

                        // Apply our local batch updates to the fresh library
                        // We only update apps that still exist in storage (prevents resurrecting deleted apps)
                        results.forEach(result => {
                            if (result.status === 'fulfilled') {
                                const { app, release, hasUpdate } = result.value;
                                const freshApp = freshLibrary.apps.find(a => a.owner === app.owner && a.repo === app.repo);

                                if (freshApp) {
                                    freshApp.latestVersion = release.tag_name;
                                    freshApp.lastChecked = new Date().toISOString();
                                    freshApp.hasUpdate = hasUpdate;
                                    changesApplied = true;
                                }
                            }
                        });

                        if (changesApplied) {
                            StorageService.saveLibrary(freshLibrary);
                        }
                    } catch (e) {
                        console.error('Failed to save batch updates:', e);
                    }
                }

                // Delay before next batch (if not last batch)
                if (i + BATCH_SIZE < library.apps.length) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY));
                }
            }

            if (btn) {
                const icons = typeof Icons !== 'undefined' ? Icons : null;
                btn.disabled = false;
                btn.innerHTML = `<span>${icons ? icons.get('refresh', 'icon-sm') : '🔄'}</span><span>Check Updates</span>`;
            }

            // Final badge update
            if (typeof Header !== 'undefined') {
                const currentLib = StorageService.getLibrary(); // Reload to be safe or use current modified
                const count = library.apps.filter(a => a.hasUpdate).length; // Use in-memory updated list
                Header.updateBadge(count);
            }

            if (updatesFound > 0) {
                Toast.show(`${updatesFound} update${updatesFound > 1 ? 's' : ''} available`, 'success');
            } else if (errors === 0) {
                Toast.show('All apps are up to date', 'success');
            } else {
                Toast.show('Completed with some errors', 'warning');
            }
        } finally {
            // Always clear the updateInProgress flag
            updateInProgress = false;
        }
    }

    /**
     * Sanitize string to prevent CSV injection
     * @param {string} value - Value to sanitize
     * @returns {string} Sanitized value
     */
    function sanitizeForCSV(value) {
        if (typeof value !== 'string') return value;

        // Check if starts with dangerous characters
        const dangerous = ['=', '+', '-', '@', '\t', '\r'];
        if (dangerous.some(char => value.startsWith(char))) {
            // Prepend with single quote to neutralize
            return "'" + value;
        }

        return value;
    }

    /**
     * Export library data to JSON file (with CSV injection protection)
     */
    function exportLibrary() {
        try {
            const data = StorageService.exportLibrary();

            // Parse JSON to sanitize it
            const parsed = JSON.parse(data);

            // Sanitize all string fields to prevent CSV injection
            if (parsed.apps && Array.isArray(parsed.apps)) {
                parsed.apps = parsed.apps.map(app => {
                    const sanitized = {};
                    for (const [key, value] of Object.entries(app)) {
                        if (typeof value === 'string') {
                            sanitized[key] = sanitizeForCSV(value);
                        } else {
                            sanitized[key] = value;
                        }
                    }
                    return sanitized;
                });
            }

            const sanitizedData = JSON.stringify(parsed, null, 2);
            const blob = new Blob([sanitizedData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${CONFIG.EXPORT ? CONFIG.EXPORT.FILENAME_PREFIX : 'gitget-library-'}${timestamp}${CONFIG.EXPORT ? CONFIG.EXPORT.FILENAME_SUFFIX : '.json'}`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.setAttribute('download', filename); // Extra security
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Toast.show('Library exported successfully', 'success');

            // Warn user about spreadsheet opening
            setTimeout(() => {
                Toast.show('⚠️ Do not open JSON files in Excel', 'warning');
            }, 1500);
        } catch (error) {
            console.error('Export failed:', error);
            Toast.show('Failed to export library', 'error');
        }
    }

    /**
     * Import library
     */
    function importLibrary() {
        const textarea = document.getElementById('import-textarea');
        const data = textarea?.value.trim();

        if (!data) {
            Toast.show(ErrorMessages.GITHUB.INVALID_INPUT, 'error'); // "Please paste..."
            return;
        }

        try {
            const count = StorageService.importLibrary(data);
            if (typeof Modal !== 'undefined') Modal.closeAll();
            Toast.show(`Imported ${count} apps`, 'success');
            render();
            if (textarea) textarea.value = '';
        } catch (error) {
            Toast.show(error.message || ErrorMessages.STORAGE.IMPORT_INVALID, 'error');
        }
    }

    // Public API
    return Object.freeze({
        init,
        render,
        checkUpdates
    });
})();
