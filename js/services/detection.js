/**
 * OS and Architecture Detection Service
 */
const DetectionService = (() => {
    'use strict';

    // State
    let cache = null;
    let override = null;

    /**
     * Initialize service
     */
    function init() {
        loadOverride();
    }

    /**
     * Detect user's operating system
     */
    function detectOS() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        const icons = typeof Icons !== 'undefined' ? Icons : null;

        // Check for mobile first
        if (/android/.test(userAgent)) {
            return { os: 'android', display: 'Android', icon: icons ? icons.get('android', 'os-icon') : '🤖' };
        }

        if (/iphone|ipad|ipod/.test(userAgent)) {
            return { os: 'ios', display: 'iOS', icon: icons ? icons.get('mobile', 'os-icon') : '📱' };
        }

        // Desktop OS detection
        if (/win/.test(platform) || /win/.test(userAgent)) {
            return { os: 'windows', display: 'Windows', icon: icons ? icons.get('windows', 'os-icon') : '🪟' };
        }

        if (/mac/.test(platform) || /mac/.test(userAgent)) {
            return { os: 'macos', display: 'macOS', icon: icons ? icons.get('apple', 'os-icon') : '🍎' };
        }

        if (/linux/.test(platform) || /linux/.test(userAgent)) {
            const linuxIcon = icons ? icons.get('linux', 'os-icon') : '🐧';
            if (/ubuntu/.test(userAgent)) {
                return { os: 'linux', distro: 'ubuntu', display: 'Ubuntu', icon: linuxIcon };
            }
            if (/fedora/.test(userAgent)) {
                return { os: 'linux', distro: 'fedora', display: 'Fedora', icon: linuxIcon };
            }
            return { os: 'linux', display: 'Linux', icon: linuxIcon };
        }

        if (/freebsd/.test(platform)) {
            return { os: 'freebsd', display: 'FreeBSD', icon: icons ? icons.get('linux', 'os-icon') : '😈' };
        }

        return { os: 'unknown', display: 'Unknown OS', icon: icons ? icons.get('monitor', 'os-icon') : '💻' };
    }

    /**
     * Detect CPU architecture
     */
    async function detectArch() {
        // Modern Chromium API
        if (navigator.userAgentData?.getHighEntropyValues) {
            try {
                const hints = await navigator.userAgentData.getHighEntropyValues([
                    'architecture',
                    'bitness'
                ]);

                const arch = hints.architecture?.toLowerCase() || '';
                const bitness = hints.bitness;

                if (arch === 'arm') {
                    return bitness === '64'
                        ? { arch: 'arm64', display: 'ARM64' }
                        : { arch: 'arm', display: 'ARM' };
                }

                if (arch === 'x86') {
                    return bitness === '64'
                        ? { arch: 'x64', display: 'x64' }
                        : { arch: 'x86', display: 'x86' };
                }
            } catch (e) {
                console.log('High entropy values not available, using heuristic detection');
            }
        }

        return heuristicDetectArch();
    }

    /**
     * Heuristic architecture detection fallback
     */
    function heuristicDetectArch() {
        const platform = navigator.platform.toLowerCase();
        const userAgent = navigator.userAgent.toLowerCase();

        // Apple Silicon detection
        if (/mac/.test(platform)) {
            if (/arm/.test(userAgent) || isAppleSilicon()) {
                return { arch: 'arm64', display: 'Apple Silicon' };
            }
            return { arch: 'x64', display: 'Intel' };
        }

        // Windows ARM
        if (/win/.test(platform) && /arm/.test(userAgent)) {
            return { arch: 'arm64', display: 'ARM64' };
        }

        // Linux ARM
        if (/linux/.test(platform) || /android/.test(userAgent)) {
            if (/aarch64|arm64/.test(userAgent)) {
                return { arch: 'arm64', display: 'ARM64' };
            }
            if (/armv7|arm/.test(userAgent)) {
                return { arch: 'arm', display: 'ARM' };
            }
        }

        // Default to x64
        if (/64/.test(platform) || /wow64|win64|x64|x86_64|amd64/.test(userAgent)) {
            return { arch: 'x64', display: 'x64' };
        }

        return { arch: 'x86', display: 'x86' };
    }

    /**
     * Detect Apple Silicon using WebGL
     */
    function isAppleSilicon() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (!gl) return false;

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return false;

            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            return /apple m[0-9]|apple gpu/.test(renderer.toLowerCase());
        } catch (e) {
            return false;
        }
    }

    /**
     * Get full system detection
     */
    async function detect() {
        // Return override if set
        if (override) {
            // Add skipArchFilter flag if arch is 'all'
            if (override.arch === 'all') {
                return {
                    ...override,
                    skipArchFilter: true,
                    fullDisplay: `${override.display || override.os} (All Architectures)`
                };
            }
            return override;
        }

        // Return cached if available
        if (cache) {
            return cache;
        }

        // Check sessionStorage
        const stored = sessionStorage.getItem('gitget_detection');
        if (stored) {
            cache = JSON.parse(stored);
            return cache;
        }

        // Perform detection
        const os = detectOS();
        const arch = await detectArch();

        const detection = {
            ...os,
            ...arch,
            fullDisplay: getFullDisplay(os, arch)
        };

        // Cache result
        cache = detection;
        sessionStorage.setItem('gitget_detection', JSON.stringify(detection));

        return detection;
    }

    /**
     * Get full display string
     */
    function getFullDisplay(os, arch) {
        if (os.os === 'macos') {
            return `macOS (${arch.display})`;
        }
        if (os.os === 'windows') {
            return `Windows (${arch.display})`;
        }
        if (os.os === 'linux') {
            return `${os.display} (${arch.display})`;
        }
        return os.display;
    }

    /**
     * Set manual override
     */
    function setOverride(os, arch) {
        const osInfo = getOSInfo(os);
        const archInfo = getArchInfo(arch);

        override = {
            ...osInfo,
            ...archInfo,
            fullDisplay: getFullDisplay(osInfo, archInfo),
            isOverride: true
        };

        sessionStorage.setItem('gitget_detection_override', JSON.stringify(override));
        return override;
    }

    /**
     * Clear override
     */
    function clearOverride() {
        override = null;
        sessionStorage.removeItem('gitget_detection_override');
        return detect();
    }

    /**
     * Load override from storage
     */
    function loadOverride() {
        const stored = sessionStorage.getItem('gitget_detection_override');
        if (stored) {
            override = JSON.parse(stored);
        }
    }

    /**
     * Get OS info by key
     */
    function getOSInfo(os) {
        const osMap = {
            windows: { os: 'windows', display: 'Windows', icon: '🪟' },
            macos: { os: 'macos', display: 'macOS', icon: '🍎' },
            linux: { os: 'linux', display: 'Linux', icon: '🐧' },
            android: { os: 'android', display: 'Android', icon: '🤖' },
            ios: { os: 'ios', display: 'iOS', icon: '📱' }
        };
        return osMap[os] || osMap.linux;
    }

    /**
     * Get arch info by key
     */
    function getArchInfo(arch) {
        const archMap = {
            x64: { arch: 'x64', display: 'x64' },
            x86: { arch: 'x86', display: 'x86' },
            arm64: { arch: 'arm64', display: 'ARM64' },
            arm: { arch: 'arm', display: 'ARM' }
        };
        return archMap[arch] || archMap.x64;
    }

    // Auto-init
    init();

    return Object.freeze({
        detect,
        setOverride,
        clearOverride
    });
})();
