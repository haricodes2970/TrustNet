const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const jwtConfig = require('../config/jwt');
const oauthConfig = require('../config/oauth');
const env = require('../config/env');
// Required as a namespace object (not destructured) so tests can
// monkey-patch emailService.sendOtpVerificationEmail - same technique
// aiService.js's own tests already rely on for aiProviderService.
const emailService = require('../services/email.service');
const auditLogService = require('../services/auditLogService');
const { authenticate } = require('../middlewares/auth');
const cloudinary = require('../services/cloudinary.service');
const { encryptTwoFactorSecret, decryptTwoFactorSecret } = require('../services/twoFactor.service');
const { computeAccountStatus } = require('../services/accountStatus.service');
const {
  signupLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  emailVerifyLimiter,
  twoFactorVerifyLimiter,
  refreshLimiter,
  sensitiveAccountActionLimiter,
} = require('../middlewares/rateLimiter');

const router = express.Router();

const REFRESH_COOKIE_NAME = 'trustnet_refresh';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Email OTP verification (Phase 16A).
const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const GENERIC_OTP_ERROR = { success: false, message: 'Invalid or expired verification code.' };

// crypto.randomInt is a CSPRNG (Node's crypto module), not Math.random() -
// 6 digits, same length convention this codebase's own 2FA TOTP already
// uses. Only ever handled as plaintext long enough to hash it for storage
// and hand it to the email service - never logged, never returned in an
// API response, never included in an audit log.
function generateEmailOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function issueEmailVerificationOtp(user) {
  const otp = generateEmailOtp();
  user.emailVerificationCodeHash = hashOtp(otp);
  user.emailVerificationExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  user.emailVerificationAttempts = 0;
  await user.save();

  try {
    await emailService.sendOtpVerificationEmail({ to: user.email, otp, expiresInMinutes: OTP_EXPIRY_MINUTES });
  } catch (emailError) {
    // Never block the primary request (registration/resend) on email
    // delivery failure - same "notifications/email must not block the
    // real action" reasoning used elsewhere in this codebase (messageService,
    // forgot-password's own rollback-on-failure is the one deliberate
    // exception, because there the email IS the entire point of the
    // request). The OTP is already persisted, so a subsequent
    // resend-verification call can simply issue a fresh one.
    console.error(`[email] Failed to send verification OTP to ${user.email}: ${emailError.message}`);
  }
}

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
    emailVerified: obj.emailVerified || false,
    emailVerifiedAt: obj.emailVerifiedAt || null,
    isVerified: obj.isVerified || false,
    verificationStatus: obj.verificationStatus || 'draft',
    accountStatus: obj.accountStatus || 'EMAIL_PENDING',
    onboardingCompleted: obj.onboardingCompleted || false,
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
    { sub: user._id.toString(), email: user.email, type: 'refresh', v: user.refreshTokenVersion || 0 },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );
}

function signTwoFactorChallenge(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, type: 'two_factor_login' },
    jwtConfig.accessSecret,
    { expiresIn: '5m' }
  );
}

function isValidTotp(secret, token) {
  return /^\d{6}$/.test(String(token || '')) && speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(token),
    window: 1,
  });
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

function redirectAfterOAuth(res, user) {
  if (user.twoFactorEnabled) {
    return res.redirect(`${env.CLIENT_URL}/login?twoFactorToken=${encodeURIComponent(signTwoFactorChallenge(user))}`);
  }
  const accessToken = signAccessToken(user);
  setRefreshCookie(res, signRefreshToken(user));
  return res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${accessToken}`);
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

router.post('/register', signupLimiter, async (req, res, next) => {
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

    const hashedPassword = await bcrypt.hash(password, 12);
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

    // Registration must still succeed even if the OTP email fails to send
    // (issueEmailVerificationOtp swallows that failure internally) - the
    // account is real either way, and resend-verification covers delivery
    // failures. This preserves the existing "register always succeeds once
    // validation/uniqueness checks pass" contract.
    await issueEmailVerificationOtp(user);

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      data: { user: toUserResponse(user) },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      const duplicateField = err.keyPattern ? Object.keys(err.keyPattern)[0] : null;
      const message = duplicateField === 'username'
        ? 'This username is already taken.'
        : 'An account with this email already exists.';
      return res.status(409).json({ success: false, message });
    }
    return next(err);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
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

    if (user.twoFactorEnabled) {
      return res.json({
        success: true,
        data: { requiresTwoFactor: true, twoFactorToken: signTwoFactorChallenge(user) },
      });
    }

    return sendAuthResponse(res, user);
  } catch (err) {
    return next(err);
  }
});

router.post('/login/2fa', twoFactorVerifyLimiter, async (req, res, next) => {
  try {
    const challenge = String(req.body?.twoFactorToken || '');
    const token = String(req.body?.token || '');
    let payload;
    try {
      payload = jwt.verify(challenge, jwtConfig.accessSecret);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Your two-factor login session is invalid or has expired.' });
    }
    if (payload?.type !== 'two_factor_login' || !payload.sub) {
      return res.status(401).json({ success: false, message: 'Your two-factor login session is invalid or has expired.' });
    }

    const user = await User.findById(payload.sub).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(401).json({ success: false, message: 'Two-factor authentication is not available for this account.' });
    }
    if (!isValidTotp(decryptTwoFactorSecret(user.twoFactorSecret), token)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication code.' });
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
      const emailVerified = !!profile.email_verified;
      user = await User.create({
        email: normalizedEmail,
        googleId: profile.sub,
        fullName: profile.name || normalizedEmail.split('@')[0],
        username: finalUsername,
        avatarUrl: profile.picture || '',
        // isVerified here is the pre-existing KYC field, left untouched
        // (out of this phase's scope - see the User model's own comment).
        // emailVerified is the new, separate Phase 16A field: Google
        // already confirmed this email, so there's no reason to force an
        // OTP round-trip for it.
        isVerified: !!profile.email_verified,
        emailVerified,
        emailVerifiedAt: emailVerified ? new Date() : undefined,
        accountStatus: computeAccountStatus({ emailVerified, verificationStatus: 'draft' }),
      });
    } else if (!user.googleId) {
      user.googleId = profile.sub;
      await user.save();
    }

    return redirectAfterOAuth(res, user);
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
      const emailVerified = !!profile.email_verified;
      user = await User.create({
        email: normalizedEmail,
        linkedinId: profile.sub,
        fullName: profile.name || normalizedEmail.split('@')[0],
        username: finalUsername,
        avatarUrl: profile.picture || '',
        isVerified: !!profile.email_verified,
        emailVerified,
        emailVerifiedAt: emailVerified ? new Date() : undefined,
        accountStatus: computeAccountStatus({ emailVerified, verificationStatus: 'draft' }),
      });
    } else if (!user.linkedinId) {
      user.linkedinId = profile.sub;
      await user.save();
    }

    return redirectAfterOAuth(res, user);
  } catch (err) {
    return res.redirect(`${env.CLIENT_URL}/login?oauthError=linkedin`);
  }
});

router.post('/refresh', refreshLimiter, async (req, res) => {
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

  if ((payload.v || 0) !== (user.refreshTokenVersion || 0)) {
    return res.status(401).json({ success: false, message: 'No active session.' });
  }

  return sendAuthResponse(res, user);
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.trustnet_refresh;
  if (token) {
    try {
      const payload = jwt.verify(token, jwtConfig.refreshSecret);
      if (payload?.type === 'refresh' && payload.sub) {
        await User.findByIdAndUpdate(payload.sub, { $inc: { refreshTokenVersion: 1 } });
      }
    } catch (err) {
      // Token already invalid/expired — nothing to revoke.
    }
  }
  clearRefreshCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

async function deleteVerificationAssets(documents = []) {
  // Verification documents are uploaded with type:"authenticated" (Phase
  // 16B - see verificationDocument.service.js) - Cloudinary's destroy API
  // is keyed by public_id + resource_type + type together, so a destroy
  // call that omits `type` looks for the (different) default "upload"-type
  // asset and silently fails to find/delete the real one, leaking the file
  // in Cloudinary after the account is gone.
  for (const document of documents) {
    if (!document.publicId) continue;
    await Promise.all([
      cloudinary.uploader.destroy(document.publicId, { resource_type: 'image', type: 'authenticated', invalidate: true }),
      cloudinary.uploader.destroy(document.publicId, { resource_type: 'raw', type: 'authenticated', invalidate: true }),
    ]);
  }
}

router.delete('/account', authenticate, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Your account is no longer available.' });
    }
    if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    await deleteVerificationAssets(user.verificationDocuments);
    await User.findByIdAndDelete(user._id);
    clearRefreshCookie(res);
    return res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    return next(err);
  }
});

router.get('/2fa', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorPendingSecret');
    if (!user) return res.status(401).json({ success: false, message: 'Your account is no longer available.' });
    return res.json({ success: true, data: { enabled: user.twoFactorEnabled, setupInProgress: Boolean(user.twoFactorPendingSecret) } });
  } catch (err) {
    return next(err);
  }
});

router.post('/2fa/setup', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorPendingSecret');
    if (!user) return res.status(401).json({ success: false, message: 'Your account is no longer available.' });
    if (user.twoFactorEnabled) return res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled.' });

    const secret = speakeasy.generateSecret({ name: `TrustNet (${user.email})` });
    user.twoFactorPendingSecret = encryptTwoFactorSecret(secret.base32);
    await user.save();
    return res.json({
      success: true,
      data: {
        qrCodeDataUrl: await QRCode.toDataURL(secret.otpauth_url),
        manualEntryKey: secret.base32,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/2fa/enable', authenticate, sensitiveAccountActionLimiter, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorPendingSecret +twoFactorSecret');
    if (!user) return res.status(401).json({ success: false, message: 'Your account is no longer available.' });
    if (!user.twoFactorPendingSecret) return res.status(400).json({ success: false, message: 'Start two-factor setup before confirming a code.' });
    if (!isValidTotp(decryptTwoFactorSecret(user.twoFactorPendingSecret), req.body?.token)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired authentication code.' });
    }

    user.twoFactorSecret = user.twoFactorPendingSecret;
    user.twoFactorPendingSecret = undefined;
    user.twoFactorEnabled = true;
    await user.save();
    return res.json({ success: true, message: 'Two-factor authentication enabled.', data: { enabled: true } });
  } catch (err) {
    return next(err);
  }
});

router.post('/2fa/disable', authenticate, sensitiveAccountActionLimiter, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const user = await User.findById(req.user.id).select('+password +twoFactorSecret +twoFactorPendingSecret');
    if (!user) return res.status(401).json({ success: false, message: 'Your account is no longer available.' });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) return res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled.' });
    if (!currentPassword || !user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (!isValidTotp(decryptTwoFactorSecret(user.twoFactorSecret), req.body?.token)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired authentication code.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorPendingSecret = undefined;
    await user.save();
    return res.json({ success: true, message: 'Two-factor authentication disabled.', data: { enabled: false } });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No active user.' });
  }

  return res.json({ success: true, data: toUserResponse(user) });
});

// POST, not GET (the original stub) - a sensitive one-time code belongs in
// a request body, not a query string that ends up in proxy/access logs.
// Nothing depended on the stub's GET shape (it did nothing), so this isn't
// a breaking change to any real behavior.
//
// Enumeration/timing posture: "no such account" and "wrong/expired/locked
// OTP" all return the exact same GENERIC_OTP_ERROR (400) - a caller cannot
// distinguish "this email has no account" from "this email exists but you
// guessed wrong," closing the account-enumeration and cross-account
// verification angles at once (you cannot verify an account without also
// knowing its live, unexpired, unused OTP). "Already verified" is the one
// case given a distinct response - reaching it already requires knowing a
// valid email *and* format-correct OTP, so it isn't a new enumeration
// surface, and returning the same generic 400 there would make a
// perfectly working double-submit look like a failure.
router.post('/verify-email', emailVerifyLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();

    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json(GENERIC_OTP_ERROR);
    }

    const user = await User.findOne({ email }).select(
      '+emailVerificationCodeHash +emailVerificationExpires +emailVerificationAttempts'
    );
    if (!user) {
      return res.status(400).json(GENERIC_OTP_ERROR);
    }
    if (user.emailVerified) {
      return res.status(200).json({ success: true, message: 'Email is already verified.' });
    }

    const noActiveOtp =
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date() ||
      (user.emailVerificationAttempts || 0) >= MAX_OTP_ATTEMPTS;
    if (noActiveOtp) {
      return res.status(400).json(GENERIC_OTP_ERROR);
    }

    const submittedHash = hashOtp(otp);
    if (submittedHash !== user.emailVerificationCodeHash) {
      // Atomic increment - concurrent wrong guesses can't undercount each
      // other the way a read-then-write would.
      await User.findByIdAndUpdate(user._id, { $inc: { emailVerificationAttempts: 1 } });
      return res.status(400).json(GENERIC_OTP_ERROR);
    }

    // Atomic, condition-checked update: only succeeds if the account is
    // still unverified AND the hash/expiry still match what was just read.
    // Two concurrent requests with the correct OTP can both reach this
    // point, but only one findOneAndUpdate call can match+mutate - the
    // loser sees emailVerified already flipped (or the hash already
    // unset) and gets null back, handled as the generic error below. This
    // is what guarantees "marked verified exactly once" under a race,
    // not just under normal sequential use.
    const verified = await User.findOneAndUpdate(
      {
        _id: user._id,
        emailVerified: false,
        emailVerificationCodeHash: submittedHash,
        emailVerificationExpires: { $gt: new Date() },
      },
      {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        // Always KYC_PENDING, never straight to APPROVED - verificationStatus
        // is still whatever it already was (draft for a brand-new account,
        // since this branch is only reached once, pre-KYC), and
        // computeAccountStatus deterministically resolves that to
        // KYC_PENDING once emailVerified flips true.
        accountStatus: computeAccountStatus({ emailVerified: true, verificationStatus: user.verificationStatus }),
        $unset: { emailVerificationCodeHash: '', emailVerificationExpires: '', emailVerificationAttempts: '' },
      },
      { new: true }
    );

    if (!verified) {
      return res.status(400).json(GENERIC_OTP_ERROR);
    }

    auditLogService
      .createLog({ actor: verified._id, action: 'auth.email_verified', targetType: 'User', targetId: verified._id, details: {}, ip: req.ip })
      .catch((error) => {
        console.error(`[audit] Failed to log "auth.email_verified" by ${verified._id}: ${error.message}`);
      });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      data: { user: toUserResponse(verified) },
    });
  } catch (err) {
    return next(err);
  }
});

// Enumeration-safe: unlike /verify-email, this endpoint requires no proof
// of account ownership at all (just an email address), so - like
// /forgot-password - it always returns the same generic success message
// regardless of whether the account exists or is already verified. Only a
// real, existing, unverified account actually gets a new OTP issued and
// emailed.
router.post('/resend-verification', resendVerificationLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const successMessage = 'If an account exists for that email and needs verification, a new code has been sent.';
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }

    const user = await User.findOne({ email });
    if (user && !user.emailVerified) {
      // Issuing a fresh OTP overwrites the previous hash/expiry/attempts
      // outright - the old code stops working immediately, not just once
      // it expires ("previous OTP invalidation on resend").
      await issueEmailVerificationOtp(user);
    }

    return res.json({ success: true, message: successMessage });
  } catch (err) {
    return next(err);
  }
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }

    const successMessage = 'If an account exists for that email, a password reset link has been sent.';
    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) return res.json({ success: true, message: successMessage });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;
    try {
      await emailService.sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(503).json({ success: false, message: 'Unable to send the password reset email. Please try again later.' });
    }

    return res.json({ success: true, message: successMessage });
  } catch (err) {
    return next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.confirmPassword || '');
    if (!token) return res.status(400).json({ success: false, message: 'Password reset token is required.' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');
    if (!user) {
      return res.status(400).json({ success: false, message: 'This password reset link is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    await user.save();
    return res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    return next(err);
  }
});

router.put('/change-password', authenticate, sensitiveAccountActionLimiter, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required.' });
    }
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters and include uppercase, lowercase, and a number.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirmation do not match.' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Your account is no longer available.' });
    }
    if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    await user.save();
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
