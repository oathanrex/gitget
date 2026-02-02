/**
 * Local Storage Service - Optimized & Secured Version
 * 
 * Improvements:
 * - Data integrity verification with checksums
 * - Automatic backup system
 * - Corruption recovery
 * - Better error messages
 * - Input validation
 * - Map-based indexing for O(1) lookups
 * - Constants instead of magic numbers
 */

const StorageService = (() => {
    'use strict';

    // Constants
    const CONSTANTS = {
        LIBRARY_KEY: 'gitget_library',
        LIBRARY_BACKUP_KEY: 'gitget_library_backup',
        SETTINGS_KEY: 'gitget_settings',
        VERSION: 1,
        MAX_APPS: 100,
        VALIDATION: {
            MAX_OWNER_LENGTH: 100,
            MAX_REPO_LENGTH: 100,
            MAX_DISPLAY_NAME_LENGTH: 200
        }
    };

    // In-memory index for fast lookups
    let libraryIndex = null;

    /**
     * Calculate simple checksum for data integrity
     * @private
     * @param {Object} data - Data to checksum
     * @returns {string} Checksum hash
     */
    function calculateChecksum(data) {
        try {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString(36);
        } catch (error) {
            console.error('Error calculating checksum:', error);
            return '';
        }
    }

    /**
     * Verify data integrity
     * @private
     */
    function verifyChecksum(stored) {
        if (!stored || !stored.data || !stored.checksum) {
            return false;
        }

        const calculatedChecksum = calculateChecksum(stored.data);
        return stored.checksum === calculatedChecksum;
    }

    /**
     * Validate app object structure
     * @private
     */
    function validateApp(app) {
        const requiredFields = ['owner', 'repo', 'displayName', 'savedVersion', 'savedDate'];

        // Check required fields
        for (const field of requiredFields) {
            if (!app[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate types
        if (typeof app.owner !== 'string' || typeof app.repo !== 'string') {
            throw new Error('Owner and repo must be strings');
        }

        // Validate lengths
        if (app.owner.length > CONSTANTS.VALIDATION.MAX_OWNER_LENGTH) {
            throw new Error('Owner name too long');
        }

        if (app.repo.length > CONSTANTS.VALIDATION.MAX_REPO_LENGTH) {
            throw new Error('Repository name too long');
        }

        if (app.displayName.length > CONSTANTS.VALIDATION.MAX_DISPLAY_NAME_LENGTH) {
            throw new Error('Display name too long');
        }

        // Validate characters (alphanumeric, hyphens, underscores, dots)
        const validPattern = /^[\w.-]+$/;
        if (!validPattern.test(app.owner) || !validPattern.test(app.repo)) {
            throw new Error('Invalid characters in owner or repo name');
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}T/.test(app.savedDate)) {
            throw new Error('Invalid date format');
        }

        return true;
    }

    /**
     * Build index for fast lookups
     * @private
     */
    function buildIndex(library) {
        const index = new Map();

        if (!library || !Array.isArray(library.apps)) {
            return index;
        }

        library.apps.forEach(app => {
            const key = `${app.owner}/${app.repo}`;
            index.set(key, app);
        });

        return index;
    }

    /**
     * Get library from localStorage with integrity check
     */
    function getLibrary() {
        try {
            const raw = localStorage.getItem(CONSTANTS.LIBRARY_KEY);

            if (!raw) {
                const emptyLibrary = {
                    version: CONSTANTS.VERSION,
                    apps: [],
                    lastModified: new Date().toISOString()
                };
                libraryIndex = buildIndex(emptyLibrary);
                return emptyLibrary;
            }

            const stored = JSON.parse(raw);

            // Check if data has integrity fields (new format)
            if (stored.checksum && stored.data) {
                // Verify integrity
                if (!verifyChecksum(stored)) {
                    console.error('Library data integrity check failed');
                    return recoverFromBackup();
                }

                const library = stored.data;
                libraryIndex = buildIndex(library);
                return library;
            } else {
                // Old format - migrate
                console.log('Migrating old library format');
                const library = stored;

                // Save in new format
                saveLibrary(library);

                libraryIndex = buildIndex(library);
                return library;
            }
        } catch (error) {
            console.error('Error reading library:', error);
            return recoverFromBackup();
        }
    }

    /**
     * Attempt to recover from backup
     * @private
     */
    function recoverFromBackup() {
        console.log('Attempting recovery from backup...');

        try {
            const backupRaw = localStorage.getItem(CONSTANTS.LIBRARY_BACKUP_KEY);

            if (!backupRaw) {
                console.warn('No backup available');
                return { version: CONSTANTS.VERSION, apps: [] };
            }

            const backup = JSON.parse(backupRaw);

            // Verify backup integrity
            if (backup.checksum && backup.data) {
                if (!verifyChecksum(backup)) {
                    console.error('Backup also corrupted');
                    return { version: CONSTANTS.VERSION, apps: [] };
                }

                console.log('Successfully recovered from backup');

                // Restore the backup to main storage
                localStorage.setItem(CONSTANTS.LIBRARY_KEY, backupRaw);

                // Notify user if Toast is available
                if (typeof Toast !== 'undefined') {
                    Toast.show('Library recovered from backup', 'success');
                }

                const library = backup.data;
                libraryIndex = buildIndex(library);
                return library;
            }

            return { version: CONSTANTS.VERSION, apps: [] };
        } catch (error) {
            console.error('Error recovering from backup:', error);
            return { version: CONSTANTS.VERSION, apps: [] };
        }
    }

    /**
     * Save library to localStorage with integrity
     */
    function saveLibrary(library) {
        try {
            // Validate library structure
            if (!library || !Array.isArray(library.apps)) {
                throw new Error('Invalid library structure');
            }

            // Add metadata
            library.version = CONSTANTS.VERSION;
            library.lastModified = new Date().toISOString();

            // Create backup of current state
            const current = localStorage.getItem(CONSTANTS.LIBRARY_KEY);
            if (current) {
                localStorage.setItem(CONSTANTS.LIBRARY_BACKUP_KEY, current);
            }

            // Create wrapper with checksum
            const wrapper = {
                version: CONSTANTS.VERSION,
                timestamp: Date.now(),
                data: library,
                checksum: calculateChecksum(library)
            };

            // Save
            localStorage.setItem(CONSTANTS.LIBRARY_KEY, JSON.stringify(wrapper));

            // Rebuild index
            libraryIndex = buildIndex(library);

            return true;
        } catch (error) {
            console.error('Error saving library:', error);

            if (error.name === 'QuotaExceededError') {
                throw new Error('Storage is full. Please remove some apps from your library.');
            }

            throw new Error('Failed to save library: ' + error.message);
        }
    }

    /**
     * Add app to library with validation
     */
    function addApp(app) {
        try {
            const library = getLibrary();

            // Check if already exists (using index for O(1) lookup)
            const key = `${app.owner}/${app.repo}`;
            if (libraryIndex && libraryIndex.has(key)) {
                return false;
            }

            // Check limit
            if (library.apps.length >= CONSTANTS.MAX_APPS) {
                throw new Error(`Library limit reached (${CONSTANTS.MAX_APPS} apps). Please remove some apps.`);
            }

            // Prepare new app object
            const newApp = {
                owner: app.owner,
                repo: app.repo,
                displayName: app.displayName || app.repo,
                savedVersion: app.version || app.savedVersion, // Support both 'version' and 'savedVersion'
                savedDate: app.savedDate || new Date().toISOString(),
                lastChecked: app.lastChecked || null,
                latestVersion: app.latestVersion || null,
                hasUpdate: app.hasUpdate || false
            };

            // Validate the fully formed app object
            validateApp(newApp);

            // Add to library
            library.apps.push(newApp);

            saveLibrary(library);
            return true;
        } catch (error) {
            console.error('Error adding app:', error);
            throw error;
        }
    }

    /**
     * Remove app from library
     */
    function removeApp(owner, repo) {
        if (!owner || !repo) {
            throw new Error('Owner and repo are required');
        }

        try {
            const library = getLibrary();
            const initialLength = library.apps.length;

            library.apps = library.apps.filter(a =>
                !(a.owner === owner && a.repo === repo)
            );

            if (library.apps.length === initialLength) {
                console.warn(`App ${owner}/${repo} not found in library`);
                return false;
            }

            saveLibrary(library);
            return true;
        } catch (error) {
            console.error('Error removing app:', error);
            throw error;
        }
    }

    /**
     * Check if app is in library (O(1) with index)
     */
    function isInLibrary(owner, repo) {
        if (!owner || !repo) {
            return false;
        }

        // Ensure index is built
        if (!libraryIndex) {
            getLibrary();
        }

        const key = `${owner}/${repo}`;
        return libraryIndex ? libraryIndex.has(key) : false;
    }

    /**
     * Update app in library
     */
    function updateApp(owner, repo, updates) {
        if (!owner || !repo) {
            throw new Error('Owner and repo are required');
        }

        if (!updates || typeof updates !== 'object') {
            throw new Error('Updates must be an object');
        }

        try {
            const library = getLibrary();
            const app = library.apps.find(a =>
                a.owner === owner && a.repo === repo
            );

            if (!app) {
                console.warn(`App ${owner}/${repo} not found`);
                return false;
            }

            // Merge updates
            Object.assign(app, updates);

            // Update lastChecked if not explicitly set
            if (!updates.lastChecked) {
                app.lastChecked = new Date().toISOString();
            }

            saveLibrary(library);
            return true;
        } catch (error) {
            console.error('Error updating app:', error);
            throw error;
        }
    }

    /**
     * Get apps with updates
     */
    function getAppsWithUpdates() {
        const library = getLibrary();
        return library.apps.filter(a => a.hasUpdate === true);
    }

    /**
     * Export library as JSON
     */
    function exportLibrary() {
        try {
            const library = getLibrary();
            return JSON.stringify(library, null, 2);
        } catch (error) {
            console.error('Error exporting library:', error);
            throw new Error('Failed to export library');
        }
    }

    /**
     * Import library from JSON with validation
     */
    function importLibrary(json) {
        try {
            // Validate input
            if (!json || typeof json !== 'string') {
                throw new Error('Invalid import data');
            }

            if (json.length > 1000000) { // 1MB limit
                throw new Error('Import file too large');
            }

            const data = JSON.parse(json);

            // Validate structure
            if (!data.apps || !Array.isArray(data.apps)) {
                throw new Error('Invalid library format: missing apps array');
            }

            // Validate version compatibility
            if (data.version && data.version > CONSTANTS.VERSION) {
                throw new Error(`Library version ${data.version} is not supported. Please update the application.`);
            }

            // Validate each app
            for (const app of data.apps) {
                validateApp(app);
            }

            // Merge with existing
            const current = getLibrary();
            const existingKeys = new Set(
                current.apps.map(a => `${a.owner}/${a.repo}`)
            );

            let addedCount = 0;
            for (const app of data.apps) {
                const key = `${app.owner}/${app.repo}`;
                if (!existingKeys.has(key)) {
                    // Check if adding this app would exceed limit
                    if (current.apps.length + addedCount >= CONSTANTS.MAX_APPS) {
                        console.warn(`Import stopped: reached ${CONSTANTS.MAX_APPS} app limit`);
                        break;
                    }

                    current.apps.push(app);
                    existingKeys.add(key);
                    addedCount++;
                }
            }

            saveLibrary(current);
            return addedCount;
        } catch (error) {
            console.error('Error importing library:', error);

            if (error instanceof SyntaxError) {
                throw new Error('Invalid JSON format');
            }

            throw error;
        }
    }

    /**
     * Get settings
     */
    function getSettings() {
        try {
            const data = localStorage.getItem(CONSTANTS.SETTINGS_KEY);
            if (!data) {
                return { theme: 'system' };
            }

            const settings = JSON.parse(data);

            // Validate settings
            if (typeof settings !== 'object') {
                return { theme: 'system' };
            }

            return settings;
        } catch (error) {
            console.error('Error reading settings:', error);
            return { theme: 'system' };
        }
    }

    /**
     * Save settings
     */
    function saveSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            throw new Error('Settings must be an object');
        }

        try {
            localStorage.setItem(CONSTANTS.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw new Error('Failed to save settings');
        }
    }

    /**
     * Get theme preference
     */
    function getTheme() {
        try {
            const settings = getSettings();

            if (settings.theme === 'system') {
                // Detect system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    return 'dark';
                }
                return 'light';
            }

            return settings.theme || 'light';
        } catch (error) {
            console.error('Error getting theme:', error);
            return 'light';
        }
    }

    /**
     * Set theme
     */
    function setTheme(theme) {
        const validThemes = ['light', 'dark', 'system'];

        if (!validThemes.includes(theme)) {
            throw new Error(`Invalid theme: ${theme}`);
        }

        try {
            const settings = getSettings();
            settings.theme = theme;
            saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Error setting theme:', error);
            throw error;
        }
    }

    /**
     * Clear all data
     */
    function clearAll() {
        try {
            localStorage.removeItem(CONSTANTS.LIBRARY_KEY);
            localStorage.removeItem(CONSTANTS.LIBRARY_BACKUP_KEY);
            localStorage.removeItem(CONSTANTS.SETTINGS_KEY);
            sessionStorage.clear();
            libraryIndex = null;
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw new Error('Failed to clear data');
        }
    }

    /**
     * Get storage stats
     */
    function getStats() {
        const library = getLibrary();
        const updatesCount = library.apps.filter(a => a.hasUpdate).length;

        return {
            totalApps: library.apps.length,
            maxApps: CONSTANTS.MAX_APPS,
            updatesAvailable: updatesCount,
            lastModified: library.lastModified,
            version: library.version
        };
    }

    // Public API
    return Object.freeze({
        getLibrary,
        saveLibrary,
        addApp,
        removeApp,
        isInLibrary,
        updateApp,
        getAppsWithUpdates,
        exportLibrary,
        importLibrary,
        getSettings,
        saveSettings,
        getTheme,
        setTheme,
        clearAll,
        getStats,

        // Expose constants for external use
        CONSTANTS: Object.freeze(CONSTANTS)
    });
})();
