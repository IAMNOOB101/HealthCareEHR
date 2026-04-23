import express from "express";
import { getInbox, getSentMessages, sendMessage, markAsRead } from "../../controllers/portal/messages.portal.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

router.use(protectPortal);

router.get("/", getInbox);
router.get("/sent", getSentMessages);
router.post("/", sendMessage);
router.patch("/:id/read", markAsRead);

export default router;
