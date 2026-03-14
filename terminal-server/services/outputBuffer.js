/**
 * Output Log Buffer (for IDE Output tab)
 */
class OutputBuffer {
    constructor() {
        this.buffer = [];
        this.MAX_OUTPUT_LINES = 1000;
        this.io = null; // Will be set during initialization
    }

    setIo(io) {
        this.io = io;
    }

    pushLog(source, level, message) {
        const entry = { source, level, message, timestamp: new Date().toISOString() };
        this.buffer.push(entry);
        if (this.buffer.length > this.MAX_OUTPUT_LINES) {
            this.buffer.shift();
        }
        if (this.io) {
            this.io.emit('output-log', entry);
        }
    }

    getHistory() {
        return this.buffer.slice(-200);
    }
}

// Export as a singleton
module.exports = new OutputBuffer();
