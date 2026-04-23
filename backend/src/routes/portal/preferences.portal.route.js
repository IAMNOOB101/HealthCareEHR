import express from "express";
import { getMyPreferences, updateMyPreferences } from "../../controllers/portal/preferences.portal.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

router.use(protectPortal);

router.get("/", getMyPreferences);
router.put("/", updateMyPreferences);

export default router;
