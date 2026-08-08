const express = require('express');

const router = express.Router();

// Phase 17 (final audit): these two endpoints have never been implemented.
// They previously answered `200 {success: true, message: "...endpoint
// ready"}` with no data and no auth, which reads to a client as a working
// endpoint - the frontend already carries workaround comments calling them
// unimplemented stubs. A 501 states the same fact honestly, so nothing
// builds against a response that will never carry real data.
//
// The real functionality already exists elsewhere and should be used
// instead: `GET /api/v1/profile` and `PUT /api/v1/profile` for the
// authenticated user's own profile, `GET /api/v1/search?type=users` for
// public user lookup, and `GET /api/v1/admin/users/:id` for admin reads.
// A public user-profile-by-id endpoint is tracked in BACKLOG.md.
//
// The matching userController.js was deleted in the same pass: it was
// wired to no route at all, and its createUser/updateUser handlers passed
// req.body straight into the User model with no authentication and no
// field whitelist - a privilege-escalation shape (role, accountStatus,
// isVerified all settable) sitting one route registration away from being
// live.
function notImplemented(req, res) {
  return res.status(501).json({
    success: false,
    message: 'This endpoint is not implemented. Use /api/v1/profile for the current user, or /api/v1/search?type=users for public lookup.',
  });
}

router.get('/:id', notImplemented);
router.put('/profile', notImplemented);

module.exports = router;
