/**
 * Centralized Configuration Constants
 * 
 * All magic numbers and configuration values are defined here
 * for easy maintenance and consistency across the application.
 */

const CONFIG = Object.freeze({
    // API Configuration
    API: Object.freeze({
        GITHUB: Object.freeze({
            BASE_URL: 'https://api.github.com',
            RATE_LIMIT_DEFAULT: 60,
            RATE_LIMIT_WARNING_THRESHOLD: 20,
            RATE_LIMIT_ERROR_THRESHOLD: 10
        })
    }),

    // Cache Configuration
    CACHE: Object.freeze({
        DURATION_MS: 5 * 60 * 1000,  // 5 minutes
        STALE_DURATION_MS: 60 * 60 * 1000,  // 1 hour
        MAX_SIZE: 50
    }),

    // Storage Configuration
    STORAGE: Object.freeze({
        KEYS: Object.freeze({
            LIBRARY: 'gitget_library',
            LIBRARY_BACKUP: 'gitget_library_backup',
            SETTINGS: 'gitget_settings',
            DETECTION: 'gitget_detection'
        }),
        VERSION: 1,
        MAX_APPS: 100,
        MAX_IMPORT_SIZE_BYTES: 1000000  // 1MB
    }),

    // Validation Limits
    VALIDATION: Object.freeze({
        MAX_INPUT_LENGTH: 300,
        MAX_REPO_COMPONENT_LENGTH: 100,
        MAX_OWNER_LENGTH: 100,
        MAX_REPO_LENGTH: 100,
        MAX_DISPLAY_NAME_LENGTH: 200,
        VALID_REPO_PATTERN: /^[\w.-]+$/,
        PROHIBITED_NAMES: Object.freeze(['.', '..', 'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'])
    }),

    // UI Configuration
    UI: Object.freeze({
        TOAST_DURATION_MS: 3000,
        TOAST_DURATION_LONG_MS: 5000,
        DEBOUNCE_DELAY_MS: 300,
        THROTTLE_DELAY_MS: 500,
        ANIMATION_DURATION_MS: 200,
        MODAL_TRANSITION_MS: 300,
        SCROLL_DEBOUNCE_MS: 100
    }),

    // Network & Retry Configuration
    NETWORK: Object.freeze({
        RETRY: Object.freeze({
            MAX_ATTEMPTS: 3,
            INITIAL_DELAY_MS: 1000,
            MAX_DELAY_MS: 10000,
            BACKOFF_FACTOR: 2
        }),
        TIMEOUT_MS: 30000  // 30 seconds
    }),

    // Library Update Batching
    LIBRARY_UPDATES: Object.freeze({
        BATCH_SIZE: 3,
        BATCH_DELAY_MS: 1000
    }),

    // Theme Options
    THEME: Object.freeze({
        LIGHT: 'light',
        DARK: 'dark',
        SYSTEM: 'system',
        VALID_OPTIONS: Object.freeze(['light', 'dark', 'system'])
    }),

    // File Size Limits
    FILE_SIZE: Object.freeze({
        LARGE_FILE_THRESHOLD_BYTES: 500 * 1024 * 1024,  // 500MB
        WARNING_SIZE_BYTES: 100 * 1024 * 1024  // 100MB
    }),

    // Intersection Observer (for lazy loading)
    LAZY_LOAD: Object.freeze({
        ROOT_MARGIN: '100px',
        THRESHOLD: 0.1
    }),

    // Detection Service
    DETECTION: Object.freeze({
        CACHE_DURATION_MS: 24 * 60 * 60 * 1000,  // 24 hours
        SUPPORTED_OS: Object.freeze(['windows', 'macos', 'linux']),
        SUPPORTED_ARCH: Object.freeze(['x64', 'arm64', 'x86'])
    }),

    // Asset Matching Scores
    MATCHING: Object.freeze({
        SCORE: Object.freeze({
            EXACT_ARCH: 100,
            UNIVERSAL: 50,
            NO_ARCH: 25,
            OS_KEYWORD: 50,
            OS_EXTENSION: 75,
            EXTENSION_PRIORITY_MULTIPLIER: 15,
            LARGE_FILE_PENALTY: -10
        })
    }),

    // Feature Flags (for gradual rollout)
    FEATURES: Object.freeze({
        LAZY_LOAD_FEATURED: false,
        ERROR_TRACKING: false,
        ANALYTICS: false,
        OFFLINE_MODE: false
    }),

    // Console Logging Levels
    LOG_LEVEL: Object.freeze({
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    }),
    CURRENT_LOG_LEVEL: 2,  // INFO (can be changed for debugging)

    // Export Filename Pattern
    EXPORT: Object.freeze({
        FILENAME_PREFIX: 'gitget-library-',
        FILENAME_SUFFIX: '.json',
        DATE_FORMAT: 'YYYY-MM-DD'
    })
});

// Freeze nested objects recursively (already done with Object.freeze above)
// This ensures complete immutability

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
