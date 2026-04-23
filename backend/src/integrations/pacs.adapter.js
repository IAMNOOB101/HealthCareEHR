import { BaseAdapter } from "./base.adapter.js";

export class PACSAdapter extends BaseAdapter {
    constructor() { super("PACS"); }

    async uploadImaging(imagingOrderId, metadata) {
        this.log("uploadImaging", { imagingOrderId, ...metadata });
        await this.simulateLatency();
        
        // 5% Failure Rate to test DB transaction rollback for imaging orders
        await this.simulateFailure(0.05);

        return {
            success: true,
            pacsUrl: `https://pacs.healthcare.mock/studies/IMG-ORD-${imagingOrderId}`,
            studyInstanceUid: `1.2.840.113619.MOCK.${Date.now()}`
        };
    }

    async getImagingResult(imagingOrderId) {
        this.log("getImagingResult", { imagingOrderId });
        await this.simulateLatency();
        await this.simulateFailure(0.05);

        return {
            success: true,
            report: "Mock radiologist interpretation: No acute abnormalities detected. Exam is normal.",
            images: [
                `https://pacs.healthcare.mock/scan/${imagingOrderId}/slice1.dcm`,
                `https://pacs.healthcare.mock/scan/${imagingOrderId}/slice2.dcm`
            ]
        };
    }
}

export const pacs = new PACSAdapter();
