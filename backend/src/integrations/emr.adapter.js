import { BaseAdapter } from "./base.adapter.js";

export class EMRAdapter extends BaseAdapter {
    constructor() { super("External EMR"); }

    async exportPatientRecord(patientId) {
        this.log("exportPatientRecord", { patientId });
        await this.simulateLatency();
        await this.simulateFailure(0.01);

        return { 
            success: true, 
            ccdUrl: `https://hie.healthcare.mock/download/ccd-${patientId}.xml`, // Continuity of Care Document
            format: "HL7_CDA"
        };
    }

    async importPatientRecord(externalCcdUrl) {
        this.log("importPatientRecord", { externalCcdUrl });
        await this.simulateLatency();
        await this.simulateFailure(0.05);

        return {
            success: true,
            status: "Imported",
            patientData: {
                firstName: "Imported",
                lastName: "Patient",
                dateOfBirth: "1980-01-01"
            }
        };
    }
}

export const emr = new EMRAdapter();
