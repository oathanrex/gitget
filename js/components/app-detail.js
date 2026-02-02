/**
 * App Detail Component
 * 
 * Renders the detailed view of an application.
 */

const AppDetail = (() => {
    'use strict';

    /**
     * Render app detail view
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     */
    async function render(owner, repo) {
        const container = document.getElementById('detail-content');
        if (!container) return;

        // Show loading
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading app details...</p>
            </div>
        `;

        try {
            // Check network status first
            if (!navigator.onLine) {
                throw new Error(ErrorMessages.NETWORK.OFFLINE);
            }

            const appInfo = await GitHubService.getAppInfo(owner, repo);
            const detection = await DetectionService.detect();
            renderContent(container, appInfo, detection);
        } catch (error) {
            console.error('Error loading app detail:', error);

            let errorMessage = error.message;
            if (error.name === 'NotFoundError') errorMessage = ErrorMessages.GITHUB.NOT_FOUND;

            container.innerHTML = `
                <a href="#/" class="detail-back">← Back to Home</a>
                <div class="error-state">
                    <span class="error-icon">❌</span>
                    <h3>Error Loading App</h3>
                    <p>${errorMessage}</p>
                    <a href="#/" class="btn btn-primary">Go Home</a>
                </div>
            `;
        }
    }

    // Worker instance
    let markdownWorker = null;

    /**
     * Initialize Worker
     */
    function initWorker() {
        if (typeof Worker !== 'undefined' && !markdownWorker) {
            // Check for local file protocol restriction
            if (window.location.protocol === 'file:') {
                console.debug('Worker disabled due to file:// protocol restriction. Using main thread fallback.');
                return;
            }

            try {
                markdownWorker = new Worker('js/workers/markdown.worker.js');
                markdownWorker.onmessage = (e) => {
                    const { id, html } = e.data;
                    const container = document.getElementById(id);
                    if (container) {
                        container.innerHTML = html;
                        container.classList.remove('loading-notes');
                    }
                };
            } catch (e) {
                console.warn('Failed to initialize Markdown worker (likely due to local file restrictions):', e);
                markdownWorker = null; // Ensure fallback is used
            }
        }
    }

    /**
     * Initialize
     */
    initWorker();

    /**
     * Render content
     */
    function renderContent(container, appInfo, detection) {
        const { repo, release } = appInfo;
        const isInLibrary = StorageService.isInLibrary(repo.owner.login, repo.name);

        const assets = release?.assets?.filter(a => MatchingService.isInstaller(a)) || [];
        const { compatible = [], incompatible = [] } = MatchingService.filterAndRankAssets(
            assets, detection.os, detection.arch, detection.skipArchFilter
        ) || {};

        // Usage of AppCard helpers
        const icon = AppCard.getRepoIcon(repo);
        const name = AppCard.escapeHtml(repo.name);
        const icons = typeof Icons !== 'undefined' ? Icons : null;

        container.innerHTML = `
            <a href="#/" class="detail-back">${icons ? icons.get('arrowDown', 'icon-sm rotate-90') : '←'} Back to Home</a>

            <div class="detail-header">
                <div class="detail-icon" aria-hidden="true">${icon}</div>
                <div class="detail-info">
                    <h1 class="detail-name">${name}</h1>
                    <div class="detail-repo">${repo.owner.login}/${repo.name}</div>
                    <div class="detail-meta">
                        <span class="detail-meta-item">${icons ? icons.get('star', 'icon-sm') : '⭐'} ${AppCard.formatNumber(repo.stargazers_count)} stars</span>
                        <span class="detail-meta-item">${icons ? icons.get('fork', 'icon-sm') : '🍴'} ${AppCard.formatNumber(repo.forks_count)} forks</span>
                        <span class="detail-meta-item">${icons ? icons.get('eye', 'icon-sm') : '👁️'} ${AppCard.formatNumber(repo.watchers_count)} watchers</span>
                        ${repo.license ? `<span class="detail-meta-item">${icons ? icons.get('license', 'icon-sm') : '📄'} ${AppCard.escapeHtml(repo.license.spdx_id || repo.license.key)}</span>` : ''}
                    </div>
                </div>
            </div>

            ${repo.description ? `<p class="detail-description">${AppCard.escapeHtml(repo.description)}</p>` : ''}

            ${repo.topics?.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-topics">
                        ${repo.topics.map(topic => `<span class="topic-tag">${AppCard.escapeHtml(topic)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${release ? `
                <div class="detail-section">
                    <h3 class="detail-section-title">
                        <span>${icons ? icons.get('package', 'icon-md') : '📦'}</span> Latest Release: ${AppCard.escapeHtml(release.tag_name)}
                    </h3>
                    <p class="release-date">Released ${AppCard.formatDate(release.published_at)}</p>
                    
                    ${compatible.length > 0 ? `
                        <div class="download-section-title mt-lg">
                            Recommended for ${detection.fullDisplay}
                        </div>
                        <div class="download-list">
                            ${compatible.map((asset, i) => AppCard.createDownloadItem(asset, i === 0)).join('')}
                        </div>
                    ` : ''}

                    ${incompatible.length > 0 || (compatible.length === 0 && assets.length > 0) ? `
                        <div class="download-section-title mt-lg">
                            Other Downloads
                        </div>
                        <div class="download-list">
                            ${(compatible.length === 0 ? assets : incompatible)
                        .map(asset => AppCard.createDownloadItem({ ...asset, match: { compatible: true } }, false))
                        .join('')}
                        </div>
                    ` : ''}

                    ${release.body ? `
                        <div class="release-notes mt-lg">
                            <h4>Release Notes</h4>
                            <div id="release-notes-${repo.id}" class="release-body loading-notes release-notes">
                                <span class="loading-spinner small"></span> Parsing markdown...
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div class="detail-section">
                    <div class="no-release">
                        <span>${icons ? icons.get('close', 'icon-lg') : '📭'}</span>
                        <p>${ErrorMessages.GITHUB.NO_RELEASES}</p>
                    </div>
                </div>
            `}

            <div class="detail-section">
                <div class="detail-actions">
                    <a href="https://github.com/${repo.owner.login}/${repo.name}" 
                       target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-large">
                        <span>${icons ? icons.get('link', 'icon-md') : '🔗'}</span> View on GitHub
                    </a>
                    <button class="btn ${isInLibrary ? 'btn-success' : 'btn-primary'} btn-large track-btn-detail"
                            data-owner="${repo.owner.login}"
                            data-repo="${repo.name}"
                            data-version="${release?.tag_name || ''}"
                            data-name="${name}"
                            aria-pressed="${isInLibrary}">
                        <span aria-hidden="true">${isInLibrary ? (icons ? icons.get('check', 'icon-md') : '✓') : (icons ? icons.get('starOutline', 'icon-md') : '☆')}</span>
                        <span>${isInLibrary ? 'In Library' : 'Add to Library'}</span>
                    </button>
                </div>
            </div>
        `;

        setupEvents(container);

        // Trigger markdown parsing
        if (release && release.body) {
            parseReleaseNotes(release.body, `release-notes-${repo.id}`);
        }
    }

    /**
     * Setup event listeners
     */
    function setupEvents(container) {
        // Track button
        const trackBtn = container.querySelector('.track-btn-detail');
        if (trackBtn) {
            trackBtn.addEventListener('click', () => {
                const { owner, repo, version, name } = trackBtn.dataset;

                const icons = typeof Icons !== 'undefined' ? Icons : null;

                if (StorageService.isInLibrary(owner, repo)) {
                    try {
                        StorageService.removeApp(owner, repo);
                        trackBtn.classList.remove('btn-success');
                        trackBtn.classList.add('btn-primary');
                        trackBtn.innerHTML = `
                            <span aria-hidden="true">${icons ? icons.get('starOutline', 'icon-md') : '☆'}</span>
                            <span>Add to Library</span>
                        `;
                        trackBtn.setAttribute('aria-pressed', 'false');
                        Toast.show('Removed from library', 'success');
                    } catch (error) {
                        Toast.show(error.message, 'error');
                    }
                } else {
                    try {
                        StorageService.addApp({ owner, repo, displayName: name, version });
                        trackBtn.classList.remove('btn-primary');
                        trackBtn.classList.add('btn-success');
                        trackBtn.innerHTML = `
                            <span aria-hidden="true">${icons ? icons.get('check', 'icon-md') : '✓'}</span>
                            <span>In Library</span>
                        `;
                        trackBtn.setAttribute('aria-pressed', 'true');
                        Toast.show('Added to library', 'success');
                    } catch (error) {
                        Toast.show(error.message, 'error');
                    }
                }

                // Update badge
                const library = StorageService.getLibrary();
                const updates = library.apps.filter(app => app.hasUpdate).length;
                if (typeof Header !== 'undefined') Header.updateBadge(updates);
            });
        }

        // Download buttons
        container.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Toast.show('Download started', 'info');
            });
        });
    }

    /**
     * Parse release notes using Worker or Fallback
     */
    function parseReleaseNotes(text, elementId) {
        if (markdownWorker) {
            markdownWorker.postMessage({ id: elementId, text: text });
        } else {
            const html = formatReleaseNotesFallback(text);
            const el = document.getElementById(elementId);
            if (el) {
                el.innerHTML = html;
                el.classList.remove('loading-notes');
            }
        }
    }

    /**
     * Fallback markdown parser (synchronous)
     */
    function formatReleaseNotesFallback(body) {
        if (!body) return '';

        // 1. Escape HTML (Safety First)
        let html = typeof AppCard !== 'undefined' ? AppCard.escapeHtml(body) : body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // 2. Allow specific HTML tags (details, summary, tables) - Whitelist approach
        const allowedTags = ['details', 'summary', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'code', 'br', 'p', 'div', 'span'];
        allowedTags.forEach(tag => {
            const regexOpen = new RegExp(`&lt;${tag}([^&]*)&gt;`, 'g'); // Capture attributes roughly
            const regexClose = new RegExp(`&lt;/${tag}&gt;`, 'g');
            html = html.replace(regexOpen, `<${tag}$1>`);
            html = html.replace(regexClose, `</${tag}>`);
        });

        // 3. Headers
        html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
        html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 4. Bold & Italic & Code
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');

        // 5. Lists (Simple single-line support)
        html = html.replace(/^\s*[\-\*] (.*$)/gim, '<li>$1</li>');

        // 6. Links [text](url)
        html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        // 7. Auto-link URLs
        html = html.replace(
            /(^|[^"'>])(https?:\/\/[^\s<]+)/g,
            '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
        );

        // 8. GitHub Emojis (Simple mapping)
        const emojiMap = {
            ':sparkles:': '✨',
            ':bug:': '🐛',
            ':beetle:': '🐞',
            ':rocket:': '🚀',
            ':memo:': '📝',
            ':art:': '🎨',
            ':recycle:': '♻️',
            ':fire:': '🔥',
            ':checkered_flag:': '🏁',
            ':white_check_mark:': '✅',
            ':warning:': '⚠️',
            ':zap:': '⚡',
            ':tada:': '🎉',
            ':butterfly:': '🦋'
        };
        Object.keys(emojiMap).forEach(key => {
            html = html.replace(new RegExp(key, 'g'), emojiMap[key]);
        });

        // 9. Newlines to <br> (avoiding breaks inside tags we just opened)
        html = html.replace(/\n/g, '<br>');

        // 10. Cleanup <br> around block tags
        html = html.replace(/<br>(\s*<[h]|<li|<details|<summary|<table|<tr|<th|<td|<div)/g, '$1');
        html = html.replace(/(<\/h[1-6]>|<\/li>|<\/details>|<\/summary>|<\/table>|<\/tr>|<\/th>|<\/td>|<\/div>)\s*<br>/g, '$1');

        return html;
    }

    // Public API
    return Object.freeze({
        render
    });
})();
