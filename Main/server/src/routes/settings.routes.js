const express = require("express");
const settingsController = require("../controllers/settingsController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { profileUpdate } = require("../validators/profile.validators");
const { preferences, privacy, appearance } = require("../validators/settings.validators");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get the current user's settings
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Combined profile and preference settings }
 */
router.get("/", settingsController.getSettings);

/**
 * @openapi
 * /settings/profile:
 *   put:
 *     summary: Update profile settings
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated profile }
 */
router.put("/profile", validate(profileUpdate), settingsController.updateProfile);

/**
 * @openapi
 * /settings/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated preferences }
 */
router.put("/preferences", validate(preferences), settingsController.updatePreferences);

/**
 * @openapi
 * /settings/privacy:
 *   put:
 *     summary: Update privacy settings
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated privacy settings }
 */
router.put("/privacy", validate(privacy), settingsController.updatePrivacy);

/**
 * @openapi
 * /settings/appearance:
 *   put:
 *     summary: Update appearance settings
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated appearance settings }
 */
router.put("/appearance", validate(appearance), settingsController.updateAppearance);

/**
 * @openapi
 * /settings/sessions:
 *   get:
 *     summary: List the current user's sessions
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Active sessions }
 */
router.get("/sessions", settingsController.getSessions);

/**
 * @openapi
 * /settings/sessions/{id}:
 *   delete:
 *     summary: Revoke a session
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Session revoked }
 */
router.delete("/sessions/:id", settingsController.deleteSession);

module.exports = router;
