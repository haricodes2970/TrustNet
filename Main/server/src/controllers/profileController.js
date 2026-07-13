const userService = require("../services/userService");
const cloudinary = require("../services/cloudinary.service");

// The mock auth layer keeps users in memory and never persists them, so the
// identity carried by the token may not yet exist in MongoDB. Resolve it to a
// profile document, creating one on first use. Authentication itself is untouched.
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

function mapProfileInput(body = {}) {
  const update = {};
  const fields = ["fullName", "username", "email", "designation", "location", "bio", "linkedin"];

  for (const key of fields) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  if (body.website !== undefined) update.websiteUrl = body.website;
  if (body.avatar !== undefined) update.avatarUrl = body.avatar;

  return update;
}

async function getProfile(req, res) {
  try {
    const user = await resolveUser(req.user.email);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const existing = await resolveUser(req.user.email);
    const updateData = mapProfileInput(req.body);
    const user = await userService.updateUser(existing._id, updateData);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No avatar file provided." });
    }

    const existing = await resolveUser(req.user.email);
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "trustnet/avatars",
      public_id: `avatar_${existing._id}`,
      overwrite: true,
    });

    const user = await userService.updateUser(existing._id, { avatarUrl: result.secure_url });

    return res.status(200).json({
      success: true,
      data: { avatar: result.secure_url, url: result.secure_url, user },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function removeAvatar(req, res) {
  try {
    const existing = await resolveUser(req.user.email);
    const user = await userService.updateUser(existing._id, { avatarUrl: "" });

    try {
      await cloudinary.uploader.destroy(`avatar_${existing._id}`);
    } catch (cloudErr) {
      // best-effort cleanup; ignore Cloudinary errors
    }

    return res.status(200).json({
      success: true,
      message: "Avatar removed.",
      data: { avatar: "", url: "", user },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { getProfile, updateProfile, uploadAvatar, removeAvatar };
