import { NotificationPreference } from "../../models/index.js";

// GET /portal/preferences
export const getMyPreferences = async (req, res) => {
    try {
        const prefs = await NotificationPreference.findOne({
            where: { portalUserId: req.portalUser.portalUserId }
        });

        if (!prefs)
            return res.status(404).json({ success: false, message: "Preferences not found" });

        return res.status(200).json({ success: true, data: prefs });
    } catch (err) {
        console.error("getMyPreferences error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /portal/preferences
export const updateMyPreferences = async (req, res) => {
    try {
        const { emailOnCritical, emailOnAppointment, emailOnPrescription, emailOnMessage, preferredContactMethod } = req.body;

        const prefs = await NotificationPreference.findOne({
            where: { portalUserId: req.portalUser.portalUserId }
        });

        if (!prefs)
            return res.status(404).json({ success: false, message: "Preferences not found" });

        await prefs.update({
            emailOnCritical: emailOnCritical !== undefined ? emailOnCritical : prefs.emailOnCritical,
            emailOnAppointment: emailOnAppointment !== undefined ? emailOnAppointment : prefs.emailOnAppointment,
            emailOnPrescription: emailOnPrescription !== undefined ? emailOnPrescription : prefs.emailOnPrescription,
            emailOnMessage: emailOnMessage !== undefined ? emailOnMessage : prefs.emailOnMessage,
            preferredContactMethod: preferredContactMethod || prefs.preferredContactMethod
        });

        return res.status(200).json({ success: true, message: "Preferences updated", data: prefs });
    } catch (err) {
        console.error("updateMyPreferences error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
