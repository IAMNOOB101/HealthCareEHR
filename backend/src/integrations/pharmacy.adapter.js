import { BaseAdapter } from "./base.adapter.js";

export class PharmacyAdapter extends BaseAdapter {
    constructor() { super("Pharmacy"); }

    async sendPrescription(prescription) {
        this.log("sendPrescription", { 
            patientId: prescription.patientId, 
            medicationId: prescription.medicationId, 
            dosage: prescription.dosage 
        });
        await this.simulateLatency();
        await this.simulateFailure(0.05);

        return { 
            success: true, 
            pharmacyRxId: `RX-EXT-${Date.now()}` 
        };
    }

    async checkDrugAvailability(medicationId) {
        this.log("checkDrugAvailability", { medicationId });
        await this.simulateLatency();

        // Very low fail rate for read queries
        await this.simulateFailure(0.01);

        return { 
            available: Math.random() > 0.05, // 95% chance drug is in stock
            estimatedStockCount: Math.floor(Math.random() * 1000) 
        };
    }
}

export const pharmacy = new PharmacyAdapter();
