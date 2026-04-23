import { BaseAdapter } from "./base.adapter.js";

export class LISAdapter extends BaseAdapter {
    constructor() { super("LIS"); }

    async sendLabOrder(labOrder) {
        this.log("sendLabOrder", { id: labOrder.id, testType: labOrder.testType, priority: labOrder.priority });
        await this.simulateLatency();
        await this.simulateFailure(0.05);

        return { 
            success: true, 
            lisOrderId: `LIS-ORD-${Date.now()}` 
        };
    }

    async fetchLabResult(lisOrderId) {
        this.log("fetchLabResult", { lisOrderId });
        await this.simulateLatency();
        await this.simulateFailure(0.05);

        return {
            success: true,
            resultValue: (Math.random() * 100).toFixed(1), // Mocks a numeric result
            unit: "mg/dL",
            referenceRange: "70.0 - 100.0",
            status: Math.random() > 0.9 ? "Critical" : "Normal" // Mocks a 10% critical rate
        };
    }
}

export const lis = new LISAdapter();
