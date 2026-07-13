const express = require('express');

const router = express.Router();

router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'User profile endpoint ready', data: { id: req.params.id } });
});

router.put('/profile', (req, res) => {
  res.json({ success: true, message: 'Profile update endpoint ready' });
});

module.exports = router;
