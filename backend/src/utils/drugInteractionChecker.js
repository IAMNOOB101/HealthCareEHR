import { Medication } from "../models/index.js";

/**
 * Checks for drug interactions between a new medication and
 * the patient's existing active medication IDs.
 * Uses contraindications array stored in each Medication record.
 */
const checkDrugInteractions = async (newMedicationId, existingMedicationIds) => {
    const interactions = [];

    if (!existingMedicationIds || existingMedicationIds.length === 0)
        return interactions;

    try {
        const newMedication = await Medication.findByPk(newMedicationId);
        if (!newMedication) return interactions;

        const existingMedications = await Medication.findAll({
            where: { id: existingMedicationIds }
        });

        for (const existingMed of existingMedications) {
            const newContraIndicatesExisting = newMedication.contraindications?.some(c =>
                c.toLowerCase() === existingMed.medicationName.toLowerCase()
            );
            const existingContraIndicatesNew = existingMed.contraindications?.some(c =>
                c.toLowerCase() === newMedication.medicationName.toLowerCase()
            );

            if (newContraIndicatesExisting || existingContraIndicatesNew) {
                interactions.push({
                    medication1: newMedication.medicationName,
                    medication2: existingMed.medicationName,
                    severity:    "High",
                    message:     `Potential interaction between ${newMedication.medicationName} and ${existingMed.medicationName}`
                });
            }
        }
    } catch (err) {
        console.error("checkDrugInteractions error:", err.message);
    }

    return interactions;
};

export { checkDrugInteractions };