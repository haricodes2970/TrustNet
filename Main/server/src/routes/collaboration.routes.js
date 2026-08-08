const express = require("express");
const collaborationController = require("../controllers/collaborationController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { collaborationRequestCreate, collaborationRequestUpdate } = require("../validators/collaboration.validators");

const router = express.Router();

// Phase 17: this router previously had NO authentication at all - every
// route below was reachable unauthenticated, exposing every collaboration
// request on the platform for read, forge, modify, and delete. No public
// tier exists for this resource; every route requires auth.
router.use(authenticate);
router.use(authorize());

/**
 * @openapi
 * /collaborations:
 *   get:
 *     summary: List your own collaboration requests (sent and/or received)
 *     tags: [Collaborations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: direction, in: query, required: false, schema: { type: string, enum: [sent, received] } }
 *       - { name: status, in: query, required: false, schema: { type: string, enum: [pending, accepted, rejected, withdrawn] } }
 *     responses:
 *       200: { description: List of your collaboration requests }
 */
router.get("/", collaborationController.listCollaborationRequests);

/**
 * @openapi
 * /collaborations/request:
 *   post:
 *     summary: Send a collaboration request (sender is always the authenticated user)
 *     tags: [Collaborations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Collaboration request created }
 *       400: { description: Invalid recipient, or sending to yourself }
 *       404: { description: Recipient not found }
 */
router.post("/request", validate(collaborationRequestCreate), collaborationController.createCollaborationRequest);

/**
 * @openapi
 * /collaborations/{id}:
 *   get:
 *     summary: Get one of your own collaboration requests (sender or recipient only)
 *     tags: [Collaborations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Collaboration request details }
 *       403: { description: Not a participant in this request }
 *       404: { description: Collaboration request not found }
 */
router.get("/:id", collaborationController.getCollaborationRequest);

/**
 * @openapi
 * /collaborations/{id}:
 *   put:
 *     summary: Respond to a collaboration request (recipient accepts/rejects, sender withdraws)
 *     tags: [Collaborations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Collaboration request updated }
 *       403: { description: Not authorized to make this transition }
 *       409: { description: Request is no longer pending }
 */
router.put("/:id", validate(collaborationRequestUpdate), collaborationController.updateCollaborationRequest);

/**
 * @openapi
 * /collaborations/{id}:
 *   delete:
 *     summary: Delete a collaboration request you sent
 *     tags: [Collaborations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Collaboration request deleted }
 *       403: { description: Only the sender can delete a request }
 */
router.delete("/:id", collaborationController.deleteCollaborationRequest);

module.exports = router;
