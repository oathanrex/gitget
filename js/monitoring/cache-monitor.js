/**
 * Cache Performance Monitor
 * Tracks and logs cache performance metrics
 */

const CacheMonitor = (() => {
    'use strict';

    const startTime = Date.now();

    /**
     * Format uptime duration
     */
    function formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }

    /**
     * Log current cache statistics
     */
    function logStats() {
        console.group('📊 GitGet Cache Performance');

        // Detection Service Metrics
        if (typeof DetectionService !== 'undefined' && DetectionService.getMetrics) {
            const detectionMetrics = DetectionService.getMetrics();
            console.log('🎯 Detection Service:');
            console.table({
                'Total Detections': detectionMetrics.detectionCount,
                'Cache Hits': detectionMetrics.cacheHits,
                'Cache Misses': detectionMetrics.cacheMisses,
                'Hit Rate': detectionMetrics.cacheHitRate,
                'Overrides': detectionMetrics.overrideCount,
                'Errors': detectionMetrics.errorCount
            });

            if (detectionMetrics.recentErrors && detectionMetrics.recentErrors.length > 0) {
                console.warn('Recent Errors:', detectionMetrics.recentErrors);
            }
        }

        // Matching Service Metrics
        if (typeof MatchingService !== 'undefined') {
            console.log('🎯 Matching Service:');
            const cacheSize = MatchingService.getCacheSize ? MatchingService.getCacheSize() : 'N/A';
            console.table({
                'Cache Size': cacheSize,
                'Cache Limit': 1000
            });
        }

        // Uptime
        const uptime = Date.now() - startTime;
        console.log(`⏱️ Uptime: ${formatUptime(uptime)}`);

        console.groupEnd();
    }

    /**
     * Start periodic monitoring
     * @param {number} intervalMs - Logging interval in milliseconds
     */
    function startMonitoring(intervalMs = 60000) {
        const intervalId = setInterval(() => logStats(), intervalMs);
        console.log(`✅ Cache monitoring started (logging every ${intervalMs / 1000}s)`);

        // Log initial stats
        logStats();

        return intervalId;
    }

    /**
     * Send metrics to analytics
     */
    function sendToAnalytics() {
        const metrics = {
            detection: typeof DetectionService !== 'undefined' && DetectionService.getMetrics
                ? DetectionService.getMetrics()
                : null,
            matching: {
                cacheSize: typeof MatchingService !== 'undefined' && MatchingService.getCacheSize
                    ? MatchingService.getCacheSize()
                    : 0
            },
            timestamp: Date.now(),
            uptime: Date.now() - startTime
        };

        // Example: Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'cache_performance', {
                detection_hit_rate: metrics.detection?.cacheHitRate || '0%',
                matching_cache_size: metrics.matching.cacheSize
            });
        }

        return metrics;
    }

    return Object.freeze({
        logStats,
        startMonitoring,
        sendToAnalytics
    });
})();

// Auto-start in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Development mode detected');
    CacheMonitor.startMonitoring(30000); // Log every 30s in dev
}
