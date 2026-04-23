import express from "express";
import { getMyLabResults, getMyRecentLabResults, getLabResultById } from "../../controllers/portal/labResults.portal.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

router.use(protectPortal);

router.get("/", getMyLabResults);
router.get("/recent", getMyRecentLabResults);
router.get("/:id", getLabResultById);

export default router;
