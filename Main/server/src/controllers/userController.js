const userService = require("../services/userService");

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getUser(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function getUserByEmail(req, res) {
  try {
    const user = await userService.getUserByEmail(req.params.email);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function getUserByUsername(req, res) {
  try {
    const user = await userService.getUserByUsername(req.params.username);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const user = await userService.deleteUser(req.params.id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function listUsers(req, res) {
  try {
    const users = await userService.listUsers(req.query.filter || {}, req.query.options || {});
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createUser,
  getUser,
  getUserByEmail,
  getUserByUsername,
  updateUser,
  deleteUser,
  listUsers,
};
