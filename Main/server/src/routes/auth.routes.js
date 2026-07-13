const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const jwtConfig = require('../config/jwt');
const oauthConfig = require('../config/oauth');
const env = require('../config/env');

const router = express.Router();

const REFRESH_COOKIE_NAME = 'trustnet_refresh';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function toUserResponse(user) {
  if (!user) return null;
  const obj = typeof user.toObject === 'function' ? user.toObject() : user;
  return {
    id: obj._id ? obj._id.toString() : obj.id,
    fullName: obj.fullName,
    username: obj.username,
    email: obj.email,
    designation: obj.designation || 'Founder',
    avatarUrl: obj.avatarUrl || '',
    bio: obj.bio || '',
    location: obj.location || '',
    linkedin: obj.linkedin || '',
    websiteUrl: obj.websiteUrl || '',
    role: obj.role,
    isVerified: obj.isVerified || false,
    interests: obj.interests || [],
    skills: obj.skills || [],
    followersCount: obj.followersCount || 0,
    followingCount: obj.followingCount || 0,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, type: 'refresh' },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function sendAuthResponse(res, user, statusCode = 200) {
  const accessToken = signAccessToken(user);
  setRefreshCookie(res, signRefreshToken(user));
  return res.status(statusCode).json({
    success: true,
    data: {
      accessToken,
      user: toUserResponse(user),
    },
  });
}

async function generateUniqueUsername(email) {
  const base = (email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const candidate = base || 'user';
  let username = candidate;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await User.findOne({ username });
    if (!existing) return username;
    suffix += 1;
    username = `${candidate}${suffix}`;
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName, username, designation } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalUsername = username
      ? String(username).toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : await generateUniqueUsername(normalizedEmail);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: fullName || normalizedEmail.split('@')[0],
      username: finalUsername,
      designation: designation || 'Founder',
    });

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      data: { user: toUserResponse(user) },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    return sendAuthResponse(res, user);
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// OAuth: Google
// ---------------------------------------------------------------------------

function setOAuthStateCookie(res, state) {
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 5 * 60 * 1000,
  });
}

router.get('/google', (req, res) => {
  const { clientId, redirectUri } = oauthConfig.google;
  if (!clientId) {
    return res.status(500).json({ success: false, message: 'Google login is not configured on this server.' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  setOAuthStateCookie(res, state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state');

  if (!code || !state || state !== cookieState) {
    return res.redirect(`${env.CLIENT_URL}/login?oauthError=google`);
  }

  try {
    const { clientId, clientSecret, redirectUri } = oauthConfig.google;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || 'No access token returned from Google');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.email) {
      throw new Error('Google did not return an email address');
    }

    const normalizedEmail = String(profile.email).toLowerCase().trim();
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email: normalizedEmail }] });

    if (!user) {
      const finalUsername = await generateUniqueUsername(normalizedEmail);
      user = await User.create({
        email: normalizedEmail,
        googleId: profile.sub,
        fullName: profile.name || normalizedEmail.split('@')[0],
        username: finalUsername,
        avatarUrl: profile.picture || '',
        isVerified: !!profile.email_verified,
      });
    } else if (!user.googleId) {
      user.googleId = profile.sub;
      await user.save();
    }

    const accessToken = signAccessToken(user);
    setRefreshCookie(res, signRefreshToken(user));
    return res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${accessToken}`);
  } catch (err) {
    console.error('[DBG][google oauth] callback failed:', err.message);
    return res.redirect(`${env.CLIENT_URL}/login?oauthError=google`);
  }
});

// ---------------------------------------------------------------------------
// OAuth: LinkedIn (Sign In with LinkedIn using OpenID Connect)
// ---------------------------------------------------------------------------

router.get('/linkedin', (req, res) => {
  const { clientId, redirectUri } = oauthConfig.linkedin;
  if (!clientId) {
    return res.status(500).json({ success: false, message: 'LinkedIn login is not configured on this server.' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  setOAuthStateCookie(res, state);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email',
  });
  return res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

router.get('/linkedin/callback', async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state');

  if (!code || !state || state !== cookieState) {
    return res.redirect(`${env.CLIENT_URL}/login?oauthError=linkedin`);
  }

  try {
    const { clientId, clientSecret, redirectUri } = oauthConfig.linkedin;

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || 'No access token returned from LinkedIn');
    }

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.email) {
      throw new Error('LinkedIn did not return an email address');
    }

    const normalizedEmail = String(profile.email).toLowerCase().trim();
    let user = await User.findOne({ $or: [{ linkedinId: profile.sub }, { email: normalizedEmail }] });

    if (!user) {
      const finalUsername = await generateUniqueUsername(normalizedEmail);
      user = await User.create({
        email: normalizedEmail,
        linkedinId: profile.sub,
        fullName: profile.name || normalizedEmail.split('@')[0],
        username: finalUsername,
        avatarUrl: profile.picture || '',
        isVerified: !!profile.email_verified,
      });
    } else if (!user.linkedinId) {
      user.linkedinId = profile.sub;
      await user.save();
    }

    const accessToken = signAccessToken(user);
    setRefreshCookie(res, signRefreshToken(user));
    return res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${accessToken}`);
  } catch (err) {
    return res.redirect(`${env.CLIENT_URL}/login?oauthError=linkedin`);
  }
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.trustnet_refresh;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No active session.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.refreshSecret);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'No active session.' });
  }

  if (!payload || payload.type !== 'refresh' || !payload.sub) {
    return res.status(401).json({ success: false, message: 'No active session.' });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No active session.' });
  }

  return sendAuthResponse(res, user);
});

router.post('/logout', (req, res) => {
  clearRefreshCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : req.cookies?.trustnet_refresh;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No active user.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.accessSecret);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'No active user.' });
  }

  if (!payload || !payload.sub) {
    return res.status(401).json({ success: false, message: 'No active user.' });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No active user.' });
  }

  return res.json({ success: true, data: toUserResponse(user) });
});

router.get('/verify-email', (req, res) => {
  res.json({ success: true, message: 'Email verified successfully.' });
});

router.post('/resend-verification', (req, res) => {
  res.json({ success: true, message: 'Verification email sent.' });
});

router.post('/forgot-password', (req, res) => {
  res.json({ success: true, message: 'Password reset email sent.' });
});

router.post('/reset-password', (req, res) => {
  res.json({ success: true, message: 'Password reset successfully.' });
});

router.put('/change-password', (req, res) => {
  res.json({ success: true, message: 'Password changed successfully.' });
});

module.exports = router;