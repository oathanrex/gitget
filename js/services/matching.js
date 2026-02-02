/**
 * Installer Matching Service
 * 
 * Determines compatibility of assets with the user's system.
 */

const MatchingService = (() => {
    'use strict';

    // Constants (could be moved to CONFIG but fine here for encapsulation)
    const OS_PATTERNS = {
        windows: {
            extensions: ['.exe', '.msi', '.msix', '.appx'],
            keywords: ['win', 'windows', 'win32', 'win64'],
            priority: ['.exe', '.msi', '.msix', '.zip'],
            icon: typeof Icons !== 'undefined' ? Icons.get('windows', 'os-icon') : '🪟'
        },
        macos: {
            extensions: ['.dmg', '.pkg'],
            keywords: ['mac', 'macos', 'darwin', 'osx', 'apple'],
            priority: ['.dmg', '.pkg', '.zip'],
            icon: typeof Icons !== 'undefined' ? Icons.get('apple', 'os-icon') : '🍎'
        },
        linux: {
            extensions: ['.appimage', '.deb', '.rpm', '.snap', '.flatpak', '.tar.gz', '.tar.xz', '.tar.bz2'],
            keywords: ['linux', 'ubuntu', 'debian', 'fedora', 'gnu', 'appimage'],
            priority: ['.appimage', '.deb', '.rpm', '.tar.gz'],
            icon: typeof Icons !== 'undefined' ? Icons.get('linux', 'os-icon') : '🐧'
        },
        android: {
            extensions: ['.apk', '.aab'],
            keywords: ['android'],
            priority: ['.apk'],
            icon: typeof Icons !== 'undefined' ? Icons.get('android', 'os-icon') : '🤖'
        },
        ios: {
            extensions: ['.ipa'],
            keywords: ['ios', 'iphone', 'ipad'],
            priority: ['.ipa'],
            icon: typeof Icons !== 'undefined' ? Icons.get('mobile', 'os-icon') : '📱'
        }
    };

    // ... (ARCH_PATTERNS unchanged)

    // ... (matchAsset, filterAndRankAssets, getBestMatch, formatSize unchanged)

    /**
     * Get icon for file type
     */
    function getFileIcon(filename) {
        if (typeof Icons === 'undefined') return '📄'; // Safe fallback

        const lower = filename.toLowerCase();
        if (lower.endsWith('.exe') || lower.endsWith('.msi')) return Icons.get('windows', 'file-icon');
        if (lower.endsWith('.dmg') || lower.endsWith('.pkg')) return Icons.get('apple', 'file-icon');
        if (lower.endsWith('.deb') || lower.endsWith('.rpm') || lower.endsWith('.appimage')) return Icons.get('package', 'file-icon');
        if (lower.endsWith('.apk')) return Icons.get('android', 'file-icon');
        if (lower.endsWith('.zip') || lower.endsWith('.tar.gz') || lower.endsWith('.tar.xz') || lower.endsWith('.7z')) return Icons.get('zip', 'file-icon');
        return Icons.get('file', 'file-icon');
    }

    const ARCH_PATTERNS = {
        x64: [
            'x64', 'x86_64', 'x86-64', 'amd64', '64bit', '64-bit',
            'win64', 'x64-bit', 'x64_64'
        ],
        x86: [
            'x86', 'i386', 'i686', '32bit', '32-bit',
            'win32', 'ia32', 'x86-32'
        ],
        arm64: [
            'arm64', 'aarch64', 'arm64e',
            // Android variants
            'arm64-v8a', 'arm64_v8a', 'arm_64',
            // macOS variants
            'apple-silicon', 'apple_silicon', 'appleSilicon',
            'm1', 'm2', 'm3', 'apple_m'
        ],
        arm: [
            'arm', 'armv7', 'armhf', 'arm32', 'armv7l',
            // Android variants
            'armeabi-v7a', 'armeabi_v7a', 'armeabi',
            'armv7a', 'arm-v7a', 'armv7-a'
        ],
        universal: [
            'universal', 'universal2', 'multi-arch', 'multiarch',
            'fat', 'lipo',  // macOS fat binaries
            'any', 'all', 'noarch', 'platform-independent',
            'multi', 'combined',
            'all-arch' // common in some android builds
        ]
    };

    /**
     * Match a single asset against detected OS and architecture
     */
    /**
     * Match a single asset against detected OS and architecture
     * @param {Object} asset - Release asset object
     * @param {string} detectedOS - Target operating system
     * @param {string} detectedArch - Target architecture
     * @param {boolean} skipArchFilter - If true, ignore architecture filtering
     * @returns {Object} Match result with compatibility and score
     */
    function matchAsset(asset, detectedOS, detectedArch, skipArchFilter = false) {
        const filename = asset.name.toLowerCase();
        const osConfig = OS_PATTERNS[detectedOS];

        if (!osConfig) {
            return { compatible: false, score: 0, reason: 'unknown_os' };
        }

        // Check OS compatibility
        const hasOSExtension = osConfig.extensions.some(ext =>
            filename.endsWith(ext.toLowerCase())
        );
        const hasOSKeyword = osConfig.keywords.some(kw =>
            filename.includes(kw.toLowerCase())
        );

        // Special case for .app.zip on macOS
        const isMacAppZip = detectedOS === 'macos' &&
            filename.endsWith('.zip') &&
            (filename.includes('mac') || filename.includes('darwin') || filename.includes('osx'));

        if (!hasOSExtension && !hasOSKeyword && !isMacAppZip) {
            // Check if it's a generic archive that might work
            const isGenericArchive = filename.endsWith('.zip') ||
                filename.endsWith('.tar.gz') ||
                filename.endsWith('.tar.xz');

            if (!isGenericArchive) {
                return { compatible: false, score: 0, reason: 'wrong_os' };
            }
        }

        // Skip architecture filtering if requested (Show All mode)
        if (skipArchFilter) {
            // In "Show All" mode, return compatible if OS matches
            return { compatible: true, score: 30, reason: 'show_all_mode', archMatch: 'any' };
        }

        // Check architecture compatibility
        const archPatterns = ARCH_PATTERNS[detectedArch] || [];
        const universalPatterns = ARCH_PATTERNS.universal;

        const hasExactArch = archPatterns.some(p => filename.includes(p.toLowerCase()));
        const hasUniversal = universalPatterns.some(p => filename.includes(p.toLowerCase()));

        // Check if file has any architecture specification
        const allArchPatterns = Object.values(ARCH_PATTERNS).flat();
        const hasAnyArch = allArchPatterns.some(p => filename.includes(p.toLowerCase()));
        const hasNoArch = !hasAnyArch;

        // Check for wrong architecture
        const wrongArchPatterns = Object.entries(ARCH_PATTERNS)
            .filter(([key]) => key !== detectedArch && key !== 'universal')
            .flatMap(([, patterns]) => patterns);
        const hasWrongArch = wrongArchPatterns.some(p => filename.includes(p.toLowerCase()));

        if (hasWrongArch && !hasExactArch && !hasUniversal) {
            // Special exemption for Android APKs
            // Many APKs internally support multiple architectures but might have a specific one in name that triggers 'wrong' detection
            // OR if it's an APK with no arch string, it might be caught here if previously logic was strict.
            // Actually, let's relax: If it's an APK, and we detected 'wrong arch', we might need to be careful.
            // But usually 'wrong arch' is correct to filter out x86 APKs for ARM devices.

            // However, common issue: file name might not have arch, so hasWrongArch is false.
            // But if hasWrongArch is TRUE, we should trust it.

            return { compatible: false, score: 0, reason: 'wrong_arch' };
        }

        const archCompatible = hasExactArch || hasUniversal || hasNoArch;

        // Special handling for Android: default assumption for APKs without arch is compatible (often universal)
        if (detectedOS === 'android' && filename.endsWith('.apk') && hasNoArch) {
            // It is already compatible via 'hasNoArch', so we just ensure score is good later.
        }

        if (!archCompatible) {
            return { compatible: false, score: 0, reason: 'wrong_arch' };
        }

        // Calculate score for ranking
        let score = 0;

        // Prefer explicit architecture matches
        if (hasExactArch) score += 100;
        if (hasUniversal) score += 50;
        if (hasNoArch) score += 25;

        // Prefer explicit OS keywords
        if (hasOSKeyword) score += 50;

        // Prefer OS-specific extensions
        if (hasOSExtension) score += 75;

        // Prefer higher-priority extensions
        const extPriority = osConfig.priority.findIndex(ext =>
            filename.endsWith(ext.toLowerCase())
        );
        if (extPriority !== -1) {
            score += (osConfig.priority.length - extPriority) * 15;
        }

        // Slight penalty for very large files (might be bundles)
        if (asset.size > 500 * 1024 * 1024) { // > 500MB
            score -= 10;
        }

        return {
            compatible: true,
            score,
            recommended: score >= 100,
            osMatch: hasOSKeyword || hasOSExtension,
            archMatch: hasExactArch || hasUniversal
        };
    }

    /**
     * Filter and rank assets by compatibility
     * @param {string} detectedOS - Target operating system
     * @param {string} detectedArch - Target architecture
     * @param {boolean} skipArchFilter - Whether to skip architecture filtering
     * @returns {Object} Compatible and incompatible assets
     */
    function filterAndRankAssets(assets, detectedOS, detectedArch, skipArchFilter = false) {
        if (!assets || assets.length === 0) {
            return { compatible: [], incompatible: [] };
        }

        // Match all assets (now synchronous)
        const matched = assets.map(asset => ({
            ...asset,
            match: matchAsset(asset, detectedOS, detectedArch, skipArchFilter)
        }));

        const compatible = matched
            .filter(a => a.match.compatible)
            .sort((a, b) => b.match.score - a.match.score);

        const incompatible = matched
            .filter(a => !a.match.compatible);

        return { compatible, incompatible };
    }

    /**
     * Get best match for OS and architecture
     * @async
     * @param {Array} assets - Array of release assets
     * @param {string} detectedOS - Target operating system
     * @param {string} detectedArch - Target architecture
     * @returns {Promise<Object|null>} Best matching asset or null
     */
    async function getBestMatch(assets, detectedOS, detectedArch) {
        const { compatible } = await filterAndRankAssets(assets, detectedOS, detectedArch);
        return compatible.length > 0 ? compatible[0] : null;
    }

    /**
     * Format file size
     */
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Get icon for file type
     */


    /**
     * Determine if an asset is an installer
     */
    function isInstaller(asset) {
        const filename = asset.name.toLowerCase();

        // Exclude common non-installer files
        const excludePatterns = [
            'source', 'src', 'debug', 'symbol', 'pdb',
            'sha256', 'sha512', 'md5', 'checksum', 'sig', 'asc',
            'blockmap', 'yaml', 'yml', 'json', 'txt', 'md'
        ];

        if (excludePatterns.some(p => filename.includes(p))) {
            // But allow if it has installer extension
            const installerExts = ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.appimage', '.apk'];
            if (!installerExts.some(ext => filename.endsWith(ext))) {
                return false;
            }
        }

        // Include common installer extensions
        const installerExtensions = [
            '.exe', '.msi', '.msix', '.appx',
            '.dmg', '.pkg',
            '.deb', '.rpm', '.appimage', '.snap', '.flatpak',
            '.apk', '.aab', '.ipa',
            '.zip', '.tar.gz', '.tar.xz', '.tar.bz2', '.7z'
        ];

        return installerExtensions.some(ext => filename.endsWith(ext));
    }

    // Public API
    return Object.freeze({
        /**
         * Filter and rank assets by compatibility
         * @async
         */
        async filterAndRankAssets(assets, os, arch) {
            return await filterAndRankAssets(assets, os, arch);
        },
        /**
         * Get best matching asset
         * @async
         */
        async getBestMatch(assets, os, arch) {
            return await getBestMatch(assets, os, arch);
        },
        formatSize,
        getFileIcon,
        isInstaller
    });
})();
