export class BaseAdapter {
    constructor(name) {
        this.name = name;
        this.isMock = true; // Indicates real third-party connection is bypassed
    }

    log(method, data) {
        console.log(`📡 [${this.name}] ${method} called:`, data);
    }

    /**
     * Simulates network latency (200-500ms)
     */
    async simulateLatency() {
        const ms = Math.floor(Math.random() * 300) + 200;
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Introduces an artificial failure rate to test resilient transactions
     * @param {number} failRate Between 0.0 and 1.0 (e.g. 0.05 for 5%)
     * @throws Error on simulated network/remote failure
     */
    async simulateFailure(failRate = 0.05) {
        if (Math.random() < failRate) {
            console.error(`💥 [${this.name}] CRITICAL: Simulated external system timeout or 500 error!`);
            throw new Error(`${this.name} System Gateway Timeout/Error - mock integration failure`);
        }
    }
}
