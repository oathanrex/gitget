/**
 * App Card Component
 * 
 * Generates the card UI for an application including details and download links.
 */

const AppCard = (() => {
    'use strict';

    /**
     * Create app card element
     * @param {Object} appInfo - The app data from GitHubService
     * @param {Object} detection - The detection result from DetectionService
     * @returns {HTMLElement} The card element
     */
    /**
     * Get repository icon
     */
    function getRepoIcon(repo) {
        if (typeof Icons === 'undefined') return '📦';

        // Could use repo topics or language to determine icon
        if (repo.language === 'JavaScript' || repo.language === 'TypeScript') return Icons.get('code', 'lang-icon js-icon');
        if (repo.language === 'Python') return Icons.get('code', 'lang-icon py-icon');
        if (repo.language === 'Rust') return Icons.get('code', 'lang-icon rust-icon');
        if (repo.language === 'Go') return Icons.get('code', 'lang-icon go-icon');
        return Icons.get('package', 'repo-icon');
    }

    /**
     * Create app card element
     * @param {Object} appInfo - The app data from GitHubService
     * @param {Object} detection - The detection result from DetectionService
     * @returns {HTMLElement} The card element
     */
    function create(appInfo, detection) {
        const { repo, release } = appInfo;
        const card = document.createElement('div');
        card.className = 'app-card';

        // Filter assets
        const assets = release?.assets?.filter(a => MatchingService.isInstaller(a)) || [];
        const { compatible, incompatible } = MatchingService.filterAndRankAssets(
            assets, detection.os, detection.arch, detection.skipArchFilter
        );

        const isInLibrary = StorageService.isInLibrary(repo.owner.login, repo.name);
        const icons = typeof Icons !== 'undefined' ? Icons : null;

        card.innerHTML = `
            <div class="app-card-header">
                <div class="app-icon" aria-hidden="true">${getRepoIcon(repo)}</div>
                <div class="app-info">
                    <h3 class="app-name">
                        <a href="#/app/${repo.owner.login}/${repo.name}" class="app-name-link">
                            ${escapeHtml(repo.name)}
                        </a>
                        ${release ? `<span class="version-tag">${escapeHtml(release.tag_name)}</span>` : ''}
                    </h3>
                    <div class="app-repo">${repo.owner.login}/${repo.name}</div>
                    <div class="app-meta">
                        <span class="app-meta-item" title="Stars">${icons ? icons.get('star', 'icon-sm') : '⭐'} ${formatNumber(repo.stargazers_count)}</span>
                        <span class="app-meta-item" title="Forks">${icons ? icons.get('fork', 'icon-sm') : '🍴'} ${formatNumber(repo.forks_count)}</span>
                        ${release ? `<span class="app-meta-item" title="Published">${icons ? icons.get('calendar', 'icon-sm') : '📅'} ${formatDate(release.published_at)}</span>` : ''}
                    </div>
                </div>
            </div>

            ${repo.description ? `<p class="app-description">${escapeHtml(repo.description)}</p>` : ''}

            ${renderDownloadsSection(compatible, incompatible, assets, detection)}

            <div class="app-card-footer">
                <div class="app-links">
                    <a href="https://github.com/${repo.owner.login}/${repo.name}" 
                       target="_blank" rel="noopener noreferrer" class="btn btn-secondary" aria-label="View on GitHub">
                        <span>${icons ? icons.get('link', 'icon-sm') : '🔗'}</span> GitHub
                    </a>
                    ${release ? `
                        <a href="${release.html_url}" 
                           target="_blank" rel="noopener noreferrer" class="btn btn-secondary" aria-label="View Release Notes">
                            <span>${icons ? icons.get('file', 'icon-sm') : '📋'}</span> Notes
                        </a>
                    ` : ''}
                </div>
                <button class="btn ${isInLibrary ? 'btn-success tracked' : 'btn-secondary'} track-btn" 
                        data-track="${repo.owner.login}/${repo.name}"
                        data-version="${release?.tag_name || ''}"
                        data-name="${escapeHtml(repo.name)}"
                        aria-pressed="${isInLibrary}">
                    <span aria-hidden="true">${isInLibrary ? (icons ? icons.get('check', 'icon-sm') : '✓') : (icons ? icons.get('starOutline', 'icon-sm') : '☆')}</span>
                    <span>${isInLibrary ? 'Tracked' : 'Track'}</span>
                </button>
            </div>
        `;

        // Setup event listeners
        setupCardEvents(card);

        return card;
    }

    /**
     * Render the downloads section
     */
    function renderDownloadsSection(compatible = [], incompatible = [], allAssets = [], detection) {
        if (!compatible) compatible = [];
        if (!incompatible) incompatible = [];
        if (!allAssets) allAssets = [];
        if (compatible.length > 0) {
            return `
                <div class="app-downloads">
                    <div class="download-section-title">Downloads for ${detection.fullDisplay}</div>
                    <div class="download-list">
                        ${compatible.slice(0, 3).map((asset, index) => createDownloadItem(asset, index === 0)).join('')}
                    </div>
                    ${incompatible.length > 0 ? `
                        <button class="show-all-assets" data-toggle-assets aria-expanded="false">
                            <span>Show all ${allAssets.length} files</span>
                            <span class="toggle-icon" aria-hidden="true">▼</span>
                        </button>
                        <div class="hidden-assets" hidden>
                            ${incompatible.map(asset => createDownloadItem(asset, false, true)).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (allAssets.length > 0) {
            return `
                <div class="app-downloads">
                    <div class="download-section-title">No compatible downloads found</div>
                    <p class="no-compatible">No installers match ${detection.fullDisplay}. 
                        <button class="show-all-assets-inline btn-text" data-toggle-assets aria-expanded="false">Show all files</button>
                    </p>
                    <div class="hidden-assets" hidden>
                        ${allAssets.map(asset => createDownloadItem({ ...asset, match: { compatible: true } }, false)).join('')}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="app-downloads">
                    <p class="no-downloads">No downloadable files in this release.</p>
                </div>
            `;
        }
    }

    /**
     * Create download item HTML
     */
    function createDownloadItem(asset, isRecommended = false, isIncompatible = false) {
        const icon = MatchingService.getFileIcon(asset.name);
        const size = MatchingService.formatSize(asset.size);

        return `
            <div class="download-item ${isRecommended ? 'recommended' : ''} ${isIncompatible ? 'incompatible' : ''}">
                <div class="download-info">
                    <div class="download-name">
                        <span class="file-icon" aria-hidden="true">${icon}</span>
                        <span title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</span>
                        ${isRecommended ? '<span class="download-badge">Recommended</span>' : ''}
                    </div>
                    <div class="download-meta">
                        ${size} • ${formatNumber(asset.download_count)} downloads
                    </div>
                </div>
                <a href="${asset.browser_download_url}" 
                   class="btn btn-primary download-btn"
                   download
                   aria-label="Download ${asset.name}">
                    Download
                </a>
            </div>
        `;
    }

    /**
     * Setup card event listeners
     */
    function setupCardEvents(card) {
        // Toggle assets visibility
        card.querySelectorAll('[data-toggle-assets]').forEach(btn => {
            btn.addEventListener('click', () => {
                const hiddenAssets = card.querySelector('.hidden-assets');
                const toggleIcon = btn.querySelector('.toggle-icon');

                if (hiddenAssets) {
                    const isHidden = hiddenAssets.hidden;
                    hiddenAssets.hidden = !isHidden;
                    hiddenAssets.classList.toggle('show', isHidden);

                    if (toggleIcon) {
                        toggleIcon.textContent = isHidden ? '▲' : '▼';
                    }

                    const btnText = btn.querySelector('span:first-child');
                    if (btnText && btn.classList.contains('show-all-assets')) {
                        btnText.textContent = isHidden
                            ? 'Hide other files'
                            : `Show all files`;
                    }

                    btn.setAttribute('aria-expanded', isHidden);
                }
            });
        });

        // Track button
        card.querySelectorAll('.track-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const [owner, repo] = btn.dataset.track.split('/');
                const version = btn.dataset.version;
                const name = btn.dataset.name;

                const icons = typeof Icons !== 'undefined' ? Icons : null;

                if (StorageService.isInLibrary(owner, repo)) {
                    try {
                        StorageService.removeApp(owner, repo);
                        btn.classList.remove('btn-success', 'tracked');
                        btn.classList.add('btn-secondary');
                        btn.innerHTML = `
                            <span aria-hidden="true">${icons ? icons.get('starOutline', 'icon-sm') : '☆'}</span>
                            <span>Track</span>
                        `;
                        btn.setAttribute('aria-pressed', 'false');
                        Toast.show(ErrorMessages.UI.SUCCESS || 'Removed from library', 'success');
                    } catch (error) {
                        Toast.show(error.message, 'error');
                    }
                } else {
                    try {
                        StorageService.addApp({ owner, repo, displayName: name, version });
                        btn.classList.remove('btn-secondary');
                        btn.classList.add('btn-success', 'tracked');
                        btn.innerHTML = `
                            <span aria-hidden="true">${icons ? icons.get('check', 'icon-sm') : '✓'}</span>
                            <span>Tracked</span>
                        `;
                        btn.setAttribute('aria-pressed', 'true');
                        Toast.show(ErrorMessages.UI.SUCCESS || 'Added to library', 'success');
                    } catch (error) {
                        Toast.show(error.message, 'error');
                    }
                }

                // Update badge
                const library = StorageService.getLibrary();
                const updates = library.apps.filter(app => app.hasUpdate).length; // Use correct filter logic
                if (typeof Header !== 'undefined') Header.updateBadge(updates);
            });
        });

        // Download tracking
        card.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Toast.show('Download started', 'info');
            });
        });
    }

    /**
     * Format number
     */
    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Public API
    return Object.freeze({
        create,
        createDownloadItem, // Exposed for AppDetail
        getRepoIcon,        // Exposed for AppDetail
        formatNumber,       // Exposed for AppDetail
        formatDate,         // Exposed for AppDetail
        escapeHtml
    });
})();
