/**
 * Centralized Error Messages
 * 
 * Consistent error messages and user feedback text.
 * Organized by domain/feature.
 */

const ErrorMessages = Object.freeze({
    // Network & Connectivity
    NETWORK: Object.freeze({
        OFFLINE: "You appear to be offline. Please check your connection.",
        TIMEOUT: "Request timed out. Please try again.",
        GENERIC: "Network error occurred. Please check your connection.",
        SERVER: "Unable to connect to the server. Please try again later."
    }),

    // GitHub API related
    GITHUB: Object.freeze({
        NOT_FOUND: "Repository not found. Please check the owner/repo format.",
        RATE_LIMIT: (resetTime) =>
            `API rate limit exceeded. Resets at ${resetTime ? resetTime.toLocaleTimeString() : 'soon'}.`,
        NO_RELEASES: "This repository doesn't have any releases yet.",
        INVALID_INPUT: "Please enter a valid repository (e.g., microsoft/vscode)",
        EMPTY_INPUT: "Please enter a repository name.",
        FORBIDDEN: "Access forbidden. You may have hit a rate limit or need authentication."
    }),

    // Storage & Library
    STORAGE: Object.freeze({
        QUOTA_EXCEEDED: "Storage is full. Please remove some apps from your library.",
        IMPORT_INVALID: "The file you're trying to import is not a valid library backup.",
        LIMIT_REACHED: (max) => `Library limit reached (${max} apps). Please remove some apps.`,
        SAVE_FAILED: "Failed to save data. Please check your storage settings.",
        CORRUPTED: "Data was corrupted and has been recovered from backup.",
        ITEM_EXISTS: "This app is already in your library.",
        NOT_FOUND: "Item not found in library."
    }),

    // System / OS Detection
    DETECTION: Object.freeze({
        UNSUPPORTED: "Your operating system could not be accurately detected.",
        NO_MATCH: "No compatible assets found for your system."
    }),

    // General UI
    UI: Object.freeze({
        COPY_SUCCESS: "Copied to clipboard!",
        COPY_FAIL: "Failed to copy to clipboard.",
        UNKNOWN_ERROR: "An unexpected error occurred. Please try again."
    })
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorMessages;
}
