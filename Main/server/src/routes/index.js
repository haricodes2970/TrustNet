const express = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const startupRoutes = require('./startup.routes');
const communityRoutes = require('./community.routes');
const postRoutes = require('./post.routes');
const collaborationRoutes = require('./collaboration.routes');
const profileRoutes = require('./profile.routes');
const dashboardRoutes = require('./dashboard.routes');
const messageRoutes = require('./message.routes');
const notificationRoutes = require('./notification.routes');
const settingsRoutes = require('./settings.routes');
const searchRoutes = require('./search.routes');
const recommendationRoutes = require('./recommendation.routes');
const verificationRoutes = require('./verification.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/startups', startupRoutes);
router.use('/communities', communityRoutes);
router.use('/posts', postRoutes);
router.use('/collaborations', collaborationRoutes);
router.use('/profile', profileRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/verification', verificationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
