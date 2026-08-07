const User = require("../models/User");

async function createUser(data) {
  try {
    const user = await User.create(data);
    return user;
  } catch (error) {
    throw new Error(error.message || "Failed to create user.");
  }
}

async function getUserById(id) {
  try {
    const user = await User.findById(id).lean();
    if (!user) {
      throw new Error("User not found.");
    }
    return user;
  } catch (error) {
    throw new Error(error.message || "Failed to fetch user.");
  }
}

async function getUserByEmail(email) {
  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      throw new Error("User not found.");
    }
    return user;
  } catch (error) {
    throw new Error(error.message || "Failed to fetch user by email.");
  }
}

async function getUserByUsername(username) {
  try {
    const user = await User.findOne({ username }).lean();
    if (!user) {
      throw new Error("User not found.");
    }
    return user;
  } catch (error) {
    throw new Error(error.message || "Failed to fetch user by username.");
  }
}

async function updateUser(id, updateData) {
  try {
    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new Error("User not found.");
    }

    return user;
  } catch (error) {
    throw new Error(error.message || "Failed to update user.");
  }
}

async function deleteUser(id) {
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new Error("User not found.");
    }
    return user;
  } catch (error) {
    throw new Error(error.message || "Failed to delete user.");
  }
}

async function listUsers(filter = {}, options = {}) {
  try {
    const query = User.find(filter);

    if (options.sort) {
      query.sort(options.sort);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.skip) {
      query.skip(options.skip);
    }

    return query.lean();
  } catch (error) {
    throw new Error(error.message || "Failed to list users.");
  }
}

async function countUsers(filter = {}) {
  try {
    return await User.countDocuments(filter);
  } catch (error) {
    throw new Error(error.message || "Failed to count users.");
  }
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  updateUser,
  deleteUser,
  listUsers,
  countUsers,
};
