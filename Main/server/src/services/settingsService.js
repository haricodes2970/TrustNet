const UserPreference = require("../models/UserPreference");
const userService = require("./userService");
const { handleServiceError } = require("./serviceUtils");

async function getOrCreatePreference(userId) {
  let preference = await UserPreference.findOne({ user: userId });
  if (!preference) {
    preference = await UserPreference.create({ user: userId });
  }
  return preference;
}

async function getSettings(userId) {
  try {
    const user = await userService.getUserById(userId);
    const preferences = await getOrCreatePreference(userId);
    return {
      profile: user.toObject ? user.toObject() : user,
      preferences: preferences.toObject ? preferences.toObject() : preferences,
    };
  } catch (error) {
    throw handleServiceError(error, "Failed to load settings.");
  }
}

function mapProfileInput(body = {}) {
  const update = {};
  const fields = ["fullName", "username", "designation", "location", "bio", "linkedin", "email"];

  for (const key of fields) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  if (body.website !== undefined) update.websiteUrl = body.website;
  if (body.avatar !== undefined) update.avatarUrl = body.avatar;

  return update;
}

async function updateProfile(userId, updateData) {
  try {
    const update = mapProfileInput(updateData);
    const user = await userService.updateUser(userId, update);
    return user.toObject ? user.toObject() : user;
  } catch (error) {
    throw handleServiceError(error, "Failed to update profile settings.");
  }
}

async function updatePreferences(userId, updateData) {
  try {
    const preference = await getOrCreatePreference(userId);
    const fields = [
      "notifications",
      "emailNotifications",
      "marketingEmails",
      "theme",
      "language",
      "timezone",
    ];

    for (const field of fields) {
      if (updateData[field] !== undefined) preference[field] = updateData[field];
    }

    await preference.save();
    return preference.toObject ? preference.toObject() : preference;
  } catch (error) {
    throw handleServiceError(error, "Failed to update preferences.");
  }
}

async function updatePrivacy(userId, updateData) {
  try {
    const preference = await getOrCreatePreference(userId);
    const fields = ["privacy", "profileVisibility", "allowMessages", "allowCollaborationRequests"];

    for (const field of fields) {
      if (updateData[field] !== undefined) preference[field] = updateData[field];
    }

    await preference.save();

    // Keep the User document's profileVisibility in sync for downstream queries.
    if (updateData.profileVisibility !== undefined) {
      try {
        await userService.updateUser(userId, { profileVisibility: updateData.profileVisibility });
      } catch (err) {
        // non-blocking
      }
    }

    return preference.toObject ? preference.toObject() : preference;
  } catch (error) {
    throw handleServiceError(error, "Failed to update privacy settings.");
  }
}

async function updateAppearance(userId, updateData) {
  try {
    const preference = await getOrCreatePreference(userId);
    const fields = ["theme", "language", "timezone"];

    for (const field of fields) {
      if (updateData[field] !== undefined) preference[field] = updateData[field];
    }

    await preference.save();
    return preference.toObject ? preference.toObject() : preference;
  } catch (error) {
    throw handleServiceError(error, "Failed to update appearance settings.");
  }
}

module.exports = {
  getSettings,
  updateProfile,
  updatePreferences,
  updatePrivacy,
  updateAppearance,
  getOrCreatePreference,
};
