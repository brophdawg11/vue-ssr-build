/**
 * PerformanceRecorder
 */
// eslint-disable-next-line max-classes-per-file
class PerformanceRecorder {
    /**
     * Create new PerformanceRecorder
     *
     * @param   {string} label         description of what the recorder is recording
     * @returns {PerformanceRecorder}  a new PerformanceRecorder instance
     */
    constructor(label) {
        this.label = label;
        this.recordingsByURL = {};
        this.urlSet = new Set();
    }

    /**
     * Record a time for this recorder for the specified URL
     *
     * @param {number} timeInMilliSeconds time in milliseconds to be recorded
     * @param {string} url                request URL to associate with this time
     */
    addRecordingForURL(timeInMilliSeconds, url) {
        if (process.env.SS_DEBUG_SERVER_PERFORMANCE === 'true') {
            if (this.recordingsByURL[url]) {
                this.recordingsByURL[url].push(timeInMilliSeconds);
            } else {
                this.recordingsByURL[url] = [timeInMilliSeconds];
            }

            this.urlSet.add(url);
        }
    }

    /**
     * Generate the maximum, minimum, and average values from what has been recorded
     *
     * @param  {string} url the URL for which you want stats generated
     * @returns {object}    an object containing min, max, and average stats
     *                      (values are null if they don't exist)
     */
    statsForURL(url) {
        if (this.urlSet.has(url)) {
            return {
                min: Math.min(...this.recordingsByURL[url]),
                max: Math.max(...this.recordingsByURL[url]),
                average: this.recordingsByURL[url].reduce((acc, value) => acc + value, 0) /
                    this.recordingsByURL[url].length,
            };
        }

        return {
            min: null,
            max: null,
            average: null,
        };
    }
}

/**
 * PerformanceRegistry
 */
class PerformanceRegistry {
    /**
     * Create new PerformanceRegistry
     *
     * @returns {PerformanceRegistry} a new instance
     */
    constructor() {
        this.registry = {};
        this.urlSet = new Set();
    }

    /**
     * Add a recording under a specified label for a specified URL
     *
     * @param {string} label              Label for the recorder that will store the time value
     * @param {number} timeInMilliSeconds Time value (in milliseconds) to record
     * @param {string} url                URL to associate with this recording
     */
    addRecordingForURL(label, timeInMilliSeconds, url) {
        if (process.env.SS_DEBUG_SERVER_PERFORMANCE === 'true') {
            if (!this.registry[label]) {
                this.registry[label] = new PerformanceRecorder(label);
            }

            this.registry[label].addRecordingForURL(timeInMilliSeconds, url);
            this.urlSet.add(url);
        }
    }

    /**
     * Get the PerformanceRecorder for a specified label
     *
     * @param  {string} label Label used for a previous recording added to this registry
     * @returns {PerformanceRecorder|undefined}       a PerformanceRecorder if found,
     *                                                undefined otherwise
     */
    recordingsForLabel(label) {
        return this.registry[label];
    }

    /**
     * Getter for all labels of recorders belonging to this registry
     * @returns {Array} all labels of the recorders in the registry
     */
    get labels() {
        return Object.keys(this.registry);
    }

    /**
     * Getter for all URLs recorded in this registry
     * @returns {Array} all URLs recorded in the registry
     */
    get urls() {
        return Array.from(this.urlSet);
    }
}

if (global && !global.performanceRegistry) {
    global.performanceRegistry = new PerformanceRegistry();
}

const registry = global ? global.performanceRegistry : new PerformanceRegistry();

module.exports = {
    performanceRegistry: registry,
};
