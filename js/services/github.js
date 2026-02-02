/**
 * GitHub API Service - Optimized & Secured Version
 * 
 * Improvements:
 * - Strict input validation and sanitization
 * - LRU cache with size limits
 * - Request throttling and retry logic
 * - Better error handling and recovery
 * - Network status awareness
 * - Stale-while-revalidate pattern for rate limits
 * - Request deduplication
 * - Token authentication support
 */

const GitHubService = (() => {
    'use strict';

    // Constants
    const CONSTANTS = {
        BASE_URL: 'https://api.github.com',
        CACHE: {
            MAX_SIZE: 50,
            DURATION_MS: 5 * 60 * 1000,  // 5 minutes
            STALE_DURATION_MS: 60 * 60 * 1000  // 1 hour (for rate limit grace)
        },
        VALIDATION: {
            MAX_COMPONENT_LENGTH: 100,
            MAX_INPUT_LENGTH: 300,
            VALID_PATTERN: /^[\w.-]+$/
        },
        RETRY: {
            MAX_ATTEMPTS: 3,
            INITIAL_DELAY_MS: 1000,
            MAX_DELAY_MS: 10000,
            BACKOFF_FACTOR: 2
        }
    };

    /**
     * LRU Cache implementation
     * @private
     */
    class LRUCache {
        constructor(maxSize = CONSTANTS.CACHE.MAX_SIZE) {
            this.maxSize = maxSize;
            this.cache = new Map();
        }

        get(key) {
            if (!this.cache.has(key)) {
                return null;
            }

            // Move to end (most recently used)
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);

            return value;
        }

        set(key, value) {
            // Remove if exists (will re-add at end)
            if (this.cache.has(key)) {
                this.cache.delete(key);
            }

            // Remove oldest if at capacity
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            this.cache.set(key, value);
        }

        has(key) {
            return this.cache.has(key);
        }

        delete(key) {
            return this.cache.delete(key);
        }

        clear() {
            this.cache.clear();
        }

        get size() {
            return this.cache.size;
        }
    }

    // State
    const state = {
        rateLimit: {
            remaining: 60,
            reset: null,
            limit: 60
        },
        cache: new LRUCache(),
        pendingRequests: new Map(),  // For deduplication
        isOnline: navigator.onLine,
        token: null
    };

    /**
     * Monitor network status
     * @private
     */
    function initNetworkMonitoring() {
        window.addEventListener('online', () => {
            state.isOnline = true;
            console.log('Network connection restored');
        });

        window.addEventListener('offline', () => {
            state.isOnline = false;
            console.warn('Network connection lost');
        });
    }

    /**
     * Load token from storage
     */
    function loadToken() {
        const token = localStorage.getItem('github_token');
        if (token) {
            state.token = token;
        }
    }

    /**
     * Set GitHub Token
     */
    /**
     * Set GitHub Token
     */
    function setToken(token) {
        if (!token) {
            state.token = null;
            localStorage.removeItem('github_token');
        } else {
            state.token = token;
            localStorage.setItem('github_token', token);
        }

        // Reset state on token change to force fresh requests
        state.cache.clear();
        state.rateLimit.remaining = 60; // Optimistic reset until next request
    }

    /**
     * Get current token status
     */
    function hasToken() {
        return !!state.token;
    }

    /**
     * Validate repository component (owner or repo name)
     * @private
     */
    function validateRepoComponent(component, fieldName = 'component') {
        if (!component) {
            throw new Error(`${fieldName} is required`);
        }

        if (typeof component !== 'string') {
            throw new Error(`${fieldName} must be a string`);
        }

        if (component.length > CONSTANTS.VALIDATION.MAX_COMPONENT_LENGTH) {
            throw new Error(`${fieldName} is too long (max ${CONSTANTS.VALIDATION.MAX_COMPONENT_LENGTH} characters)`);
        }

        // GitHub allows: alphanumeric, hyphens, underscores, dots
        if (!CONSTANTS.VALIDATION.VALID_PATTERN.test(component)) {
            throw new Error(`${fieldName} contains invalid characters. Only letters, numbers, hyphens, underscores, and dots are allowed.`);
        }

        // Prevent directory traversal and other attacks
        if (component.includes('..') || component.includes('//') || component.includes('\\')) {
            throw new Error(`${fieldName} contains invalid sequences`);
        }

        // Prevent names that could be problematic
        const prohibited = ['.', '..', 'CON', 'PRN', 'AUX', 'NUL'];
        if (prohibited.includes(component.toUpperCase())) {
            throw new Error(`${fieldName} is a prohibited name`);
        }

        return component;
    }

    /**
     * Parse repository input with strict validation
     */
    function parseRepoInput(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Repository input is required');
        }

        const trimmed = input.trim();

        if (trimmed.length === 0) {
            throw new Error('Repository input cannot be empty');
        }

        if (trimmed.length > CONSTANTS.VALIDATION.MAX_INPUT_LENGTH) {
            throw new Error('Repository input is too long');
        }

        // Decode URL encoding if present
        let decoded;
        try {
            decoded = decodeURIComponent(trimmed);
        } catch (e) {
            console.warn('Failed to decode input, using as-is');
            decoded = trimmed;
        }

        // Handle full GitHub URLs
        const urlPatterns = [
            /github\.com\/([\w.-]+)\/([\w.-]+)(?:\.git)?/i,  // https://github.com/owner/repo
            /^([\w.-]+)\/([\w.-]+)$/  // owner/repo
        ];

        for (const pattern of urlPatterns) {
            const match = decoded.match(pattern);
            if (match) {
                try {
                    const owner = validateRepoComponent(match[1], 'owner');
                    const repo = validateRepoComponent(match[2].replace(/\.git$/, ''), 'repo');

                    return { owner, repo };
                } catch (error) {
                    // Try next pattern
                    continue;
                }
            }
        }

        // No valid pattern matched
        throw new Error('Invalid repository format. Please use "owner/repo" or a GitHub URL.');
    }

    /**
     * Sleep utility for retry logic
     * @private
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Make API request with retry logic
     * @private
     */
    async function makeRequest(endpoint, options = {}, attempt = 1) {
        // Check network status (advisory)
        if (state.isOnline === false) {
            console.warn('Browser reports offline, but attempting request anyway...');
        }

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Accept-Encoding': 'gzip, deflate, br',
            ...options.headers
        };

        // Add Authorization header if token exists
        if (state.token) {
            headers['Authorization'] = `token ${state.token}`;
        }

        try {
            const response = await fetch(`${CONSTANTS.BASE_URL}${endpoint}`, {
                headers,
                signal: options.signal,  // Support AbortController
                ...options
            });

            // Update rate limit info
            updateRateLimitFromHeaders(response.headers);

            if (!response.ok) {
                await handleError(response);
            }

            return await response.json();
        } catch (error) {
            // Don't retry on abort
            if (error.name === 'AbortError') {
                throw error;
            }

            // Retry on network errors
            if (error instanceof NetworkError && attempt < CONSTANTS.RETRY.MAX_ATTEMPTS) {
                const delay = Math.min(
                    CONSTANTS.RETRY.INITIAL_DELAY_MS * Math.pow(CONSTANTS.RETRY.BACKOFF_FACTOR, attempt - 1),
                    CONSTANTS.RETRY.MAX_DELAY_MS
                );

                console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${CONSTANTS.RETRY.MAX_ATTEMPTS})`);
                await sleep(delay);

                return makeRequest(endpoint, options, attempt + 1);
            }

            // Re-throw API errors
            if (error instanceof APIError) {
                throw error;
            }

            // Network or other errors
            throw new NetworkError('Network error. Please check your connection and try again.');
        }
    }

    /**
     * Update rate limit from response headers
     * @private
     */
    function updateRateLimitFromHeaders(headers) {
        const remaining = headers.get('X-RateLimit-Remaining');
        const reset = headers.get('X-RateLimit-Reset');
        const limit = headers.get('X-RateLimit-Limit');

        if (remaining !== null) {
            state.rateLimit.remaining = parseInt(remaining, 10);
        }
        if (reset !== null) {
            state.rateLimit.reset = parseInt(reset, 10);
        }
        if (limit !== null) {
            state.rateLimit.limit = parseInt(limit, 10);
        }

        updateRateLimitUI();
    }

    // Periodic cleanup for stale pending requests (memory leak protection)
    setInterval(() => {
        const now = Date.now();
        const TIMEOUT_MS = 60000; // 60 seconds timeout for pending requests

        for (const [key, data] of state.pendingRequests.entries()) {
            // Clean up requests older than timeout
            if (data && typeof data === 'object' && data.timestamp) {
                if ((now - data.timestamp) > TIMEOUT_MS) {
                    console.warn(`Cleaning up stale request: ${key}`);
                    state.pendingRequests.delete(key);
                }
            }
        }
    }, 60000); // Run cleanup every minute

    /**
     * Make API request with caching and deduplication
     */
    async function request(endpoint, options = {}) {
        const cacheKey = `${endpoint}_${JSON.stringify(options)}`;

        // Check cache first
        const cached = state.cache.get(cacheKey);
        if (cached) {
            const age = Date.now() - cached.timestamp;

            // Return fresh cache
            if (age < CONSTANTS.CACHE.DURATION_MS) {
                return cached.data;
            }

            // For rate limit situations, use stale cache
            if (state.rateLimit.remaining <= 0 && age < CONSTANTS.CACHE.STALE_DURATION_MS) {
                console.warn('Using stale cache due to rate limit');
                return cached.data;
            }
        }

        // Check rate limit
        if (state.rateLimit.remaining <= 0 && state.rateLimit.reset) {
            const resetTime = new Date(state.rateLimit.reset * 1000);

            if (Date.now() < resetTime.getTime()) {
                // Try to use stale cache
                if (cached && cached.data) {
                    console.warn('Rate limit exceeded, using stale cache');
                    return cached.data;
                }

                throw new RateLimitError(
                    `API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`,
                    resetTime
                );
            }
        }

        // Deduplicate concurrent requests
        if (state.pendingRequests.has(cacheKey)) {
            console.log('Deduplicating concurrent request');
            const cached = state.pendingRequests.get(cacheKey);
            return cached.promise || cached; // Handle both old and new format
        }

        // Make request
        const requestPromise = makeRequest(endpoint, options)
            .then(data => {
                // Cache response
                state.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });

                // Remove from pending
                state.pendingRequests.delete(cacheKey);

                return data;
            })
            .catch(error => {
                // Remove from pending
                state.pendingRequests.delete(cacheKey);
                throw error;
            });

        // Track pending request with timestamp
        state.pendingRequests.set(cacheKey, {
            promise: requestPromise,
            timestamp: Date.now()
        });

        // Add cleanup on abort if AbortController is used
        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                state.pendingRequests.delete(cacheKey);
            }, { once: true });
        }

        return requestPromise;
    }

    /**
     * Handle API errors
     * @private
     */
    async function handleError(response) {
        const status = response.status;

        switch (status) {
            case 401:
                setToken(null);
                throw new APIError('Bad credentials. The token has been removed. Please reload.');

            case 403: {
                const resetHeader = response.headers.get('X-RateLimit-Reset');
                if (resetHeader) {
                    const resetTime = new Date(parseInt(resetHeader, 10) * 1000);
                    throw new RateLimitError(
                        `API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`,
                        resetTime
                    );
                }
                throw new APIError('Access forbidden');
            }

            case 404:
                throw new NotFoundError('Repository not found. Please check the owner/repo format.');

            case 422:
                throw new APIError('Invalid request. Please check your input.');

            case 500:
            case 502:
            case 503:
            case 504:
                throw new ServerError('GitHub is experiencing issues. Please try again later.');

            default: {
                let message = `Unexpected error (${status})`;
                try {
                    const body = await response.json();
                    if (body.message) {
                        message = body.message;
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
                throw new APIError(message);
            }
        }
    }

    /**
     * Get repository info
     */
    async function getRepository(owner, repo) {
        validateRepoComponent(owner, 'owner');
        validateRepoComponent(repo, 'repo');

        return request(`/repos/${owner}/${repo}`);
    }

    /**
     * Get latest release
     */
    async function getLatestRelease(owner, repo) {
        validateRepoComponent(owner, 'owner');
        validateRepoComponent(repo, 'repo');

        try {
            return await request(`/repos/${owner}/${repo}/releases/latest`);
        } catch (error) {
            if (error instanceof NotFoundError) {
                // Try to get any release
                try {
                    const releases = await getReleases(owner, repo, 1);
                    if (Array.isArray(releases) && releases.length > 0) {
                        return releases[0];
                    }
                } catch (fallbackError) {
                    // Ignore fallback error, stick to original NotFound
                }
                throw new NotFoundError('This repository has no releases.');
            }
            throw error;
        }
    }

    /**
     * Get all releases
     */
    async function getReleases(owner, repo, perPage = 10) {
        validateRepoComponent(owner, 'owner');
        validateRepoComponent(repo, 'repo');

        // Validate perPage
        const validPerPage = Math.min(Math.max(1, parseInt(perPage, 10) || 10), 100);

        return request(`/repos/${owner}/${repo}/releases?per_page=${validPerPage}`);
    }

    /**
     * Get full app info (repo + release)
     */
    async function getAppInfo(owner, repo) {
        validateRepoComponent(owner, 'owner');
        validateRepoComponent(repo, 'repo');

        // Use Promise.allSettled for better error handling
        const [repoResult, releaseResult] = await Promise.allSettled([
            getRepository(owner, repo),
            getLatestRelease(owner, repo)
        ]);

        // Handle repository fetch failure
        if (repoResult.status === 'rejected') {
            throw repoResult.reason;
        }

        // Release is optional
        const releaseData = releaseResult.status === 'fulfilled' ? releaseResult.value : null;

        return {
            repo: repoResult.value,
            release: releaseData,
            hasRelease: !!releaseData
        };
    }

    /**
     * Update rate limit UI
     */
    function updateRateLimitUI() {
        const remainingEl = document.getElementById('api-remaining');
        const dotEl = document.querySelector('.api-dot');
        const warningEl = document.getElementById('rate-limit-warning');
        const warningRemaining = document.getElementById('rate-limit-remaining');

        if (remainingEl) {
            remainingEl.textContent = state.rateLimit.remaining;
        }

        if (dotEl) {
            dotEl.classList.remove('warning', 'error');
            if (state.rateLimit.remaining <= 10) {
                dotEl.classList.add('error');
            } else if (state.rateLimit.remaining <= 20) {
                dotEl.classList.add('warning');
            }
        }

        if (warningEl && warningRemaining) {
            if (state.rateLimit.remaining <= 10) {
                warningEl.classList.remove('hidden');
                warningRemaining.textContent = state.rateLimit.remaining;
            } else {
                warningEl.classList.add('hidden');
            }
        }
    }

    /**
     * Get remaining requests
     */
    function getRemainingRequests() {
        return state.rateLimit.remaining;
    }

    /**
     * Get rate limit info
     */
    function getRateLimitInfo() {
        return {
            ...state.rateLimit,
            resetDate: state.rateLimit.reset ? new Date(state.rateLimit.reset * 1000) : null
        };
    }

    /**
     * Clear cache
     */
    function clearCache() {
        state.cache.clear();
        state.pendingRequests.clear();
    }

    /**
     * Get cache stats
     */
    function getCacheStats() {
        return {
            size: state.cache.size,
            maxSize: CONSTANTS.CACHE.MAX_SIZE,
            pendingRequests: state.pendingRequests.size
        };
    }

    // Initialize
    initNetworkMonitoring();
    loadToken();

    // Public API
    return {
        request,
        getRepository,
        getLatestRelease,
        getReleases,
        getAppInfo,
        parseRepoInput,
        updateRateLimitUI,
        getRemainingRequests,
        getRateLimitInfo,
        clearCache,
        getCacheStats,
        setToken,
        hasToken
    };
})();

// Custom Error Classes
class APIError extends Error {
    constructor(message) {
        super(message);
        this.name = 'APIError';
    }
}

class RateLimitError extends APIError {
    constructor(message, resetTime) {
        super(message);
        this.name = 'RateLimitError';
        this.resetTime = resetTime;
    }
}

class NotFoundError extends APIError {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}

class ServerError extends APIError {
    constructor(message) {
        super(message);
        this.name = 'ServerError';
    }
}

class NetworkError extends APIError {
    constructor(message) {
        super(message);
        this.name = 'NetworkError';
    }
}

// Polyfill for Promise.allSettled if needed
if (!Promise.allSettled) {
    Promise.allSettled = function (promises) {
        return Promise.all(
            promises.map(promise =>
                Promise.resolve(promise)
                    .then(value => ({ status: 'fulfilled', value }))
                    .catch(reason => ({ status: 'rejected', reason }))
            )
        );
    };
}
