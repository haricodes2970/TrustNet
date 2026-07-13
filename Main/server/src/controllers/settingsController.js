const settingsService = require("../services/settingsService");
const userService = require("../services/userService");

// The mock auth layer keeps users in memory and never persists them, so the
// identity carried by the token may not yet exist in MongoDB. Resolve it to a
// user document, creating one on first use. Authentication itself is untouched.
async function resolveUser(email) {
  try {
    return await userService.getUserByEmail(email);
  } catch (err) {
    const local = String(email).split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_") || "user";
    return userService.createUser({
      email,
      username: `${local}_${Math.random().toString(36).slice(2, 8)}`,
      fullName: local,
    });
  }
}

function decodeToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

async function getSettings(req, res) {
  try {
    const user = await resolveUser(req.user.email);
    const settings = await settingsService.getSettings(user._id);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const user = await resolveUser(req.user.email);
    const updated = await settingsService.updateProfile(user._id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updatePreferences(req, res) {
  try {
    const user = await resolveUser(req.user.email);
    const updated = await settingsService.updatePreferences(user._id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updatePrivacy(req, res) {
  try {
    const user = await resolveUser(req.user.email);
    const updated = await settingsService.updatePrivacy(user._id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateAppearance(req, res) {
  try {
    const user = await resolveUser(req.user.email);
    const updated = await settingsService.updateAppearance(user._id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getSessions(req, res) {
  try {
    const user = await resolveUser(req.user.email);
    const token = decodeToken(req);

    // TODO: Replace with real session storage (e.g. a Session model or Redis)
    // once multi-device sessions are implemented. For now we can only report the
    // session backing the current request token.
    const issuedAt = token
      ? Number(Buffer.from(token, "base64url").toString("utf8").split(":")[1])
      : NaN;

    const session = {
      id: token || "current",
      userId: user._id,
      email: user.email,
      createdAt: Number.isNaN(issuedAt) ? new Date().toISOString() : new Date(issuedAt).toISOString(),
      current: true,
    };

    return res.status(200).json({ success: true, data: [session] });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteSession(req, res) {
  try {
    const token = decodeToken(req);

    if (!token || req.params.id !== token) {
      // TODO: When real session storage exists, look the session up by id for the
      // authenticated user instead of only matching the current token.
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    // TODO: Invalidate the session in the real session store. With the current
    // in-memory/mock auth there is no persisted session to revoke server-side;
    // the client should clear its token (logout) after receiving this response.
    return res.status(200).json({
      success: true,
      data: { id: req.params.id, deleted: true, loggedOut: true },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  getSettings,
  updateProfile,
  updatePreferences,
  updatePrivacy,
  updateAppearance,
  getSessions,
  deleteSession,
};
