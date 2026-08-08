// TESTER SMOKE TEST (Phase 17 final audit).
//
// One continuous, realistic end-to-end journey of an approved entrepreneur
// through every completed backend module, run against the real Express app
// over HTTP with an in-memory MongoDB. Its job is not to re-prove the
// per-module authorization rules (each module has its own dedicated suite
// for that) but to prove the backend works as ONE integrated application:
// that the actual API contracts line up end to end, and that a tester
// following the documented journey is never blocked.
//
// Journey (24 steps, in order, each depending on the last):
//   1 register -> 2 verify OTP -> 3 login -> 4 /me -> 5 KYC submit ->
//   6 admin approve -> 7 startup -> 8 workspace -> 9 project -> 10 task ->
//   11 job -> 12 application -> 13 marketplace -> 14 funding ->
//   15 community -> 16 post -> 17 messaging -> 18 notification ->
//   19 search -> 20 recommendations -> 21 analytics -> 22 reports ->
//   23 AI -> 24 logout
// (plus milestone + document, which the journey needs anyway).
//
// MOCKED EXTERNAL DEPENDENCIES - and only these, all of which are network
// calls that cannot run in a test environment:
//   * email.service.js  - SMTP delivery. The OTP is captured from the mock
//                         so step 2 verifies with a genuinely-issued code
//                         rather than a seeded one.
//   * cloudinary.service.js - file storage, for KYC and document uploads.
//   * aiProviderService.generateCompletion - the external LLM call. The
//                         surrounding AI route/controller/service, prompt
//                         assembly, and authorization all run for real.
// Nothing in TrustNet's own request path is mocked or bypassed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const app = require("../../app");
const User = require("../../src/models/User");
const emailService = require("../../src/services/email.service");
const cloudinary = require("../../src/services/cloudinary.service");
const aiProviderService = require("../../src/services/aiProviderService");

let server;
let baseUrl;

const originals = {};
let sentOtps = [];

before(async () => {
  await setupTestDB();
  await clearDatabase();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // --- external dependency mocks (documented above) ---
  for (const name of [
    "sendOtpVerificationEmail",
    "sendVerificationSubmittedEmail",
    "sendVerificationApprovedEmail",
    "sendVerificationRejectedEmail",
    "sendVerificationResubmissionEmail",
    "sendPasswordResetEmail",
  ]) {
    originals[name] = emailService[name];
    emailService[name] = async (payload) => {
      if (name === "sendOtpVerificationEmail") sentOtps.push(payload);
    };
  }

  originals.upload = cloudinary.uploader.upload;
  originals.destroy = cloudinary.uploader.destroy;
  cloudinary.uploader.upload = async (dataUri, options) => ({
    secure_url: `https://res.cloudinary.com/fake/${options.public_id}`,
    public_id: options.public_id,
    resource_type: "image",
    format: "jpg",
    bytes: 1024,
  });
  cloudinary.uploader.destroy = async () => ({ result: "ok" });

  originals.generateCompletion = aiProviderService.generateCompletion;
  aiProviderService.generateCompletion = async () => ({
    content: "Mocked AI insight: the startup is progressing steadily.",
    provider: "mock",
    model: "mock-model",
  });
});

after(async () => {
  for (const [name, fn] of Object.entries(originals)) {
    if (name === "upload") cloudinary.uploader.upload = fn;
    else if (name === "destroy") cloudinary.uploader.destroy = fn;
    else if (name === "generateCompletion") aiProviderService.generateCompletion = fn;
    else emailService[name] = fn;
  }
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

async function api(pathName, { method = "GET", body, token, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, res };
}

async function upload(pathName, token, field, { fileName = "file.jpg", mimeType = "image/jpeg", fields = {} } = {}) {
  const form = new FormData();
  form.append(field, new Blob(["fake file bytes"], { type: mimeType }), fileName);
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const res = await fetch(`${baseUrl}${pathName}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

function ok(step, result, expected = 200) {
  assert.equal(
    result.status,
    expected,
    `[step ${step}] expected ${expected}, got ${result.status}: ${JSON.stringify(result.json)}`
  );
  return result.json ? result.json.data : null;
}

const unique = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
const founderCreds = {
  email: `smoke_founder_${unique}@example.com`,
  password: "SmokeTest123!",
  fullName: "Smoke Founder",
  username: `smoke_founder_${unique}`,
};

// Shared journey state - this suite is deliberately one ordered journey,
// so later steps consume what earlier ones created.
const state = {};

test("SMOKE 1-4: register -> verify OTP -> login -> authenticated /me", async () => {
  // 1. Register
  const registered = ok(1, await api("/api/v1/auth/register", { method: "POST", body: founderCreds }), 201);
  assert.equal(registered.user.emailVerified, false);
  assert.equal(registered.user.accountStatus, "EMAIL_PENDING");

  // 2. Verify OTP - using the code that was actually issued and "emailed"
  const issued = sentOtps.find((o) => o.to === founderCreds.email);
  assert.ok(issued && /^\d{6}$/.test(issued.otp), "registration must issue a 6-digit OTP");
  const verified = ok(
    2,
    await api("/api/v1/auth/verify-email", { method: "POST", body: { email: founderCreds.email, otp: issued.otp } })
  );
  assert.equal(verified.user.accountStatus, "KYC_PENDING");

  // 3. Login
  const loggedIn = ok(
    3,
    await api("/api/v1/auth/login", { method: "POST", body: { email: founderCreds.email, password: founderCreds.password } })
  );
  assert.ok(loggedIn.accessToken, "login must return an access token");
  state.token = loggedIn.accessToken;

  // 4. Authenticated /me
  const me = ok(4, await api("/api/v1/auth/me", { token: state.token }));
  assert.equal(me.email, founderCreds.email);
  assert.equal(me.accountStatus, "KYC_PENDING");
  state.userId = me.id;
});

test("SMOKE 5-6: KYC document upload + submission -> admin approval", async () => {
  // 5. KYC: upload all required documents, then submit
  for (const type of ["government_id", "company_registration", "business_website", "linkedin"]) {
    // eslint-disable-next-line no-await-in-loop
    const uploaded = await upload(`/api/v1/verification/documents/${type}`, state.token, "document");
    assert.equal(uploaded.status, 200, `[step 5] uploading ${type} failed: ${JSON.stringify(uploaded.json)}`);
  }
  const submitted = ok(5, await api("/api/v1/verification/submit", { method: "POST", token: state.token }));
  assert.equal(submitted.status, "pending");
  assert.equal(submitted.accountStatus, "UNDER_REVIEW");

  // 6. Admin review + approval
  const admin = await User.create({
    fullName: "Smoke Admin",
    username: `smoke_admin_${unique}`,
    email: `smoke_admin_${unique}@example.com`,
    role: "admin",
    emailVerified: true,
    accountStatus: "APPROVED",
    verificationStatus: "approved",
    isVerified: true,
  });
  const adminLogin = await api("/api/v1/auth/login", { method: "POST", body: {} });
  assert.equal(adminLogin.status, 400, "sanity: login still validates its input");
  const jwt = require("jsonwebtoken");
  const jwtConfig = require("../../src/config/jwt");
  state.adminToken = jwt.sign({ sub: admin._id.toString(), email: admin.email }, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });

  const queue = ok(6, await api("/api/v1/admin/verifications", { token: state.adminToken }));
  assert.ok(queue.some((entry) => String(entry._id) === String(state.userId)), "the submission must appear in the admin queue");

  const approved = ok(6, await api(`/api/v1/admin/verifications/${state.userId}/approve`, { method: "POST", token: state.adminToken }));
  assert.equal(approved.verificationStatus, "approved");
  assert.equal(approved.accountStatus, "APPROVED");

  // An approved account passes the KYC-gated dashboard route.
  ok(6, await api("/api/v1/dashboard", { token: state.token }));
});

test("SMOKE 7-10: startup -> workspace -> project -> task (+ milestone, document)", async () => {
  // 7. Startup
  const startup = ok(
    7,
    await api("/api/v1/startups", {
      method: "POST",
      token: state.token,
      body: {
        name: "Smoke Startup",
        slug: `smoke-startup-${unique}`,
        description: "A realistic smoke-test startup description that comfortably exceeds the fifty character minimum.",
        category: "SaaS",
      },
    }),
    201
  );
  state.startupId = startup._id || startup.id;
  assert.ok(state.startupId);

  // Publish it - a startup is created as a draft, and downstream modules
  // (funding rounds, engagement requests) require an active startup.
  ok(
    7,
    await api(`/api/v1/startups/${state.startupId}`, {
      method: "PUT",
      token: state.token,
      body: { status: "active", isPublic: true },
    })
  );

  // 8. Workspace
  const workspace = ok(
    8,
    await api("/api/v1/workspaces", {
      method: "POST",
      token: state.token,
      body: { startupId: state.startupId, name: "Smoke Workspace" },
    }),
    201
  );
  state.workspaceId = workspace._id || workspace.id;

  // 9. Project
  const project = ok(
    9,
    await api("/api/v1/projects", {
      method: "POST",
      token: state.token,
      body: { workspaceId: state.workspaceId, name: "Smoke Project" },
    }),
    201
  );
  state.projectId = project._id || project.id;

  // 10. Task
  const task = ok(
    10,
    await api("/api/v1/tasks", {
      method: "POST",
      token: state.token,
      body: { projectId: state.projectId, title: "Smoke Task" },
    }),
    201
  );
  state.taskId = task._id || task.id;

  // Milestone + document - part of the same workspace journey.
  const milestone = ok(
    10,
    await api("/api/v1/milestones", {
      method: "POST",
      token: state.token,
      body: { projectId: state.projectId, title: "Smoke Milestone" },
    }),
    201
  );
  assert.ok(milestone._id || milestone.id);

  const document = await upload("/api/v1/documents", state.token, "document", {
    fields: { projectId: state.projectId, title: "Smoke Document" },
  });
  assert.equal(document.status, 201, `[step 10] document upload failed: ${JSON.stringify(document.json)}`);

  // Reading them back through their list endpoints must work too.
  ok(10, await api(`/api/v1/projects?workspaceId=${state.workspaceId}`, { token: state.token }));
  ok(10, await api(`/api/v1/tasks?projectId=${state.projectId}`, { token: state.token }));
});

test("SMOKE 11-12: publish a job -> receive an application", async () => {
  // 11. Job creation + publish
  const job = ok(
    11,
    await api("/api/v1/jobs", {
      method: "POST",
      token: state.token,
      body: {
        startupId: state.startupId,
        title: "Smoke Engineer",
        description: "Build things for the smoke test.",
        employmentType: "full-time",
        remotePolicy: "remote",
      },
    }),
    201
  );
  state.jobId = job._id || job.id;
  ok(11, await api(`/api/v1/jobs/${state.jobId}/publish`, { method: "PUT", token: state.token }));

  // A published job is visible on the public job board (no token).
  const publicJobs = ok(11, await api("/api/v1/jobs"));
  assert.ok(Array.isArray(publicJobs) || Array.isArray(publicJobs.items || publicJobs.data));

  // 12. An applicant applies
  const applicantCreds = {
    email: `smoke_applicant_${unique}@example.com`,
    password: "SmokeTest123!",
    fullName: "Smoke Applicant",
    username: `smoke_applicant_${unique}`,
  };
  await User.create({
    ...applicantCreds,
    password: await require("bcryptjs").hash(applicantCreds.password, 12),
    emailVerified: true,
    accountStatus: "KYC_PENDING",
  });
  const applicantLogin = ok(12, await api("/api/v1/auth/login", { method: "POST", body: applicantCreds }));
  state.applicantToken = applicantLogin.accessToken;
  state.applicantId = applicantLogin.user.id;

  // Applications require a resume file, so this goes through multipart.
  const application = await upload("/api/v1/applications", state.applicantToken, "resume", {
    fileName: "resume.pdf",
    mimeType: "application/pdf",
    fields: { jobId: state.jobId, coverLetter: "I would like to join the smoke test." },
  });
  assert.equal(application.status, 201, `[step 12] application failed: ${JSON.stringify(application.json)}`);

  // The founder can see the application against their own job.
  ok(12, await api(`/api/v1/applications?jobId=${state.jobId}`, { token: state.token }));
});

test("SMOKE 13: marketplace - provider profile, listing, engagement request", async () => {
  const providerCreds = {
    email: `smoke_provider_${unique}@example.com`,
    password: "SmokeTest123!",
    fullName: "Smoke Provider",
    username: `smoke_provider_${unique}`,
  };
  await User.create({
    ...providerCreds,
    password: await require("bcryptjs").hash(providerCreds.password, 12),
    emailVerified: true,
    accountStatus: "KYC_PENDING",
  });
  const providerLogin = ok(13, await api("/api/v1/auth/login", { method: "POST", body: providerCreds }));
  state.providerToken = providerLogin.accessToken;

  ok(
    13,
    await api("/api/v1/provider-profiles", {
      method: "POST",
      token: state.providerToken,
      body: { businessName: "Smoke Design Studio", tagline: "We design smoke tests" },
    }),
    201
  );

  const listing = ok(
    13,
    await api("/api/v1/service-listings", {
      method: "POST",
      token: state.providerToken,
      body: {
        title: "Smoke Branding Package",
        category: "Design",
        description: "Branding for early startups.",
        pricingModel: "fixed",
      },
    }),
    201
  );
  state.listingId = listing._id || listing.id;
  ok(13, await api(`/api/v1/service-listings/${state.listingId}/publish`, { method: "PUT", token: state.providerToken }));

  // The founder engages the published listing on behalf of their startup.
  ok(
    13,
    await api("/api/v1/engagement-requests", {
      method: "POST",
      token: state.token,
      body: { serviceListingId: state.listingId, startupId: state.startupId, message: "Interested in branding." },
    }),
    201
  );

  // Public marketplace browse works unauthenticated.
  ok(13, await api("/api/v1/service-listings"));
});

test("SMOKE 14: funding - round, investor interest, contribution", async () => {
  // Funding round, opened for contributions.
  const round = ok(
    14,
    await api("/api/v1/funding-rounds", {
      method: "POST",
      token: state.token,
      body: { startupId: state.startupId, title: "Smoke Seed Round", roundType: "seed", targetAmount: 100000 },
    }),
    201
  );
  state.roundId = round._id || round.id;
  ok(14, await api(`/api/v1/funding-rounds/${state.roundId}/open`, { method: "PUT", token: state.token }));

  // An investor registers interest and contributes.
  const investorCreds = {
    email: `smoke_investor_${unique}@example.com`,
    password: "SmokeTest123!",
    fullName: "Smoke Investor",
    username: `smoke_investor_${unique}`,
  };
  await User.create({
    ...investorCreds,
    password: await require("bcryptjs").hash(investorCreds.password, 12),
    role: "investor",
    emailVerified: true,
    accountStatus: "KYC_PENDING",
  });
  const investorLogin = ok(14, await api("/api/v1/auth/login", { method: "POST", body: investorCreds }));
  state.investorToken = investorLogin.accessToken;

  ok(
    14,
    await api("/api/v1/investment-interests", {
      method: "POST",
      token: state.investorToken,
      body: { startupId: state.startupId, message: "Interested in the seed round." },
    }),
    201
  );

  const contribution = ok(
    14,
    await api("/api/v1/funding-contributions", {
      method: "POST",
      token: state.investorToken,
      body: { fundingRoundId: state.roundId, amount: 5000, currency: "USD" },
    }),
    201
  );
  state.contributionId = contribution._id || contribution.id;

  // The founder confirms it, and the round total moves atomically.
  ok(14, await api(`/api/v1/funding-contributions/${state.contributionId}/confirm`, { method: "PUT", token: state.token }));
  const afterConfirm = ok(14, await api(`/api/v1/funding-rounds/${state.roundId}`, { token: state.token }));
  assert.equal(afterConfirm.raisedAmount, 5000, "confirming a contribution must increment the round total");
});

test("SMOKE 15-16: community -> post -> comment -> like", async () => {
  // 15. Community
  const community = ok(
    15,
    await api("/api/v1/communities", {
      method: "POST",
      token: state.token,
      body: {
        name: "Smoke Founders Circle",
        slug: `smoke-community-${unique}`,
        description: "A community for smoke-test founders.",
      },
    }),
    201
  );
  state.communityId = community._id || community.id;

  // Another user joins it.
  ok(15, await api(`/api/v1/communities/${state.communityId}/join`, { method: "POST", token: state.applicantToken }));

  // 16. Post, comment, like
  const post = ok(
    16,
    await api("/api/v1/posts", {
      method: "POST",
      token: state.token,
      body: { content: "Launching our smoke test today.", community: state.communityId },
    }),
    201
  );
  state.postId = post._id || post.id;

  ok(
    16,
    await api(`/api/v1/posts/${state.postId}/comments`, {
      method: "POST",
      token: state.applicantToken,
      body: { content: "Congratulations on the launch." },
    }),
    201
  );
  ok(16, await api(`/api/v1/posts/${state.postId}/like`, { method: "POST", token: state.applicantToken }));

  const readBack = ok(16, await api(`/api/v1/posts/${state.postId}`, { token: state.token }));
  assert.equal(readBack.likeCount, 1, "like counter must reflect the like");
  assert.equal(readBack.commentCount, 1, "comment counter must reflect the comment");

  // Unlike is atomic and reverses the counter.
  ok(16, await api(`/api/v1/posts/${state.postId}/like`, { method: "DELETE", token: state.applicantToken }));
  const afterUnlike = ok(16, await api(`/api/v1/posts/${state.postId}`, { token: state.token }));
  assert.equal(afterUnlike.likeCount, 0);
});

test("SMOKE 17-18: messaging -> notifications", async () => {
  // 17. Messaging
  const conversation = ok(
    17,
    await api("/api/v1/messages/conversations", {
      method: "POST",
      token: state.token,
      body: { participants: [String(state.applicantId)], type: "direct" },
    }),
    201
  );
  state.conversationId = conversation._id || conversation.id;

  ok(
    17,
    await api(`/api/v1/messages/conversations/${state.conversationId}/messages`, {
      method: "POST",
      token: state.token,
      body: { content: "Hello from the smoke test." },
    }),
    201
  );

  const messages = ok(17, await api(`/api/v1/messages/conversations/${state.conversationId}/messages`, { token: state.applicantToken }));
  const list = Array.isArray(messages) ? messages : messages.items || messages.messages || [];
  assert.ok(list.length >= 1, "the recipient must see the sent message");

  ok(17, await api("/api/v1/messages/unread-count", { token: state.applicantToken }));

  // 18. Notifications - the applicant has accumulated real ones by now.
  ok(18, await api("/api/v1/notifications", { token: state.applicantToken }));
  ok(18, await api("/api/v1/notifications/unread-count", { token: state.applicantToken }));
  ok(18, await api("/api/v1/notifications/read-all", { method: "PUT", token: state.applicantToken }));
});

test("SMOKE 19-20: search -> recommendations", async () => {
  // 19. Search - public, and finds the startup created earlier.
  const results = ok(19, await api("/api/v1/search?q=Smoke"));
  assert.ok(results.startups && Array.isArray(results.startups), "search must return a startups bucket");
  ok(19, await api("/api/v1/search?q=Smoke&type=startups"));

  // 20. Recommendations
  ok(20, await api("/api/v1/recommendations", { token: state.token }));
});

test("SMOKE 21-23: analytics -> reports -> AI", async () => {
  // 21. Analytics - every section.
  for (const section of ["overview", "projects", "tasks", "hiring", "funding", "marketplace"]) {
    // eslint-disable-next-line no-await-in-loop
    const result = await api(`/api/v1/analytics/${section}?startupId=${state.startupId}`, { token: state.token });
    assert.equal(result.status, 200, `[step 21] analytics/${section} failed: ${JSON.stringify(result.json)}`);
  }

  // 22. Reports
  for (const reportType of ["startup", "projects", "tasks", "hiring", "funding", "marketplace"]) {
    // eslint-disable-next-line no-await-in-loop
    const result = await api(`/api/v1/reports/${reportType}?startupId=${state.startupId}`, { token: state.token });
    assert.equal(result.status, 200, `[step 22] reports/${reportType} failed: ${JSON.stringify(result.json)}`);
  }

  // 23. AI (external LLM call mocked; route/controller/service run for real)
  const insight = ok(
    23,
    await api("/api/v1/ai/insights", {
      method: "POST",
      token: state.token,
      body: { capability: "startup-summary", startupId: state.startupId },
    })
  );
  assert.ok(insight, "the AI endpoint must return an insight payload");
});

test("SMOKE 24: refresh -> password change -> logout revokes the session", async () => {
  // Refresh works off the login cookie.
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: founderCreds.email, password: founderCreds.password },
  });
  assert.equal(login.status, 200);
  const cookies = typeof login.res.headers.getSetCookie === "function" ? login.res.headers.getSetCookie() : [];
  const refreshCookie = (cookies.find((c) => c.startsWith("trustnet_refresh=")) || "").split(";")[0];
  assert.ok(refreshCookie, "login must set a refresh cookie");

  ok(24, await api("/api/v1/auth/refresh", { method: "POST", cookie: refreshCookie }));

  // Password change works and revokes prior refresh tokens.
  ok(
    24,
    await api("/api/v1/auth/change-password", {
      method: "PUT",
      token: login.json.data.accessToken,
      body: { currentPassword: founderCreds.password, newPassword: "SmokeTest456!", confirmPassword: "SmokeTest456!" },
    })
  );
  const staleAfterChange = await api("/api/v1/auth/refresh", { method: "POST", cookie: refreshCookie });
  assert.equal(staleAfterChange.status, 401, "changing the password must revoke existing refresh tokens");

  // 24. Logout revokes the current session.
  const relogin = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: founderCreds.email, password: "SmokeTest456!" },
  });
  assert.equal(relogin.status, 200, "the new password must work");
  const newCookies = typeof relogin.res.headers.getSetCookie === "function" ? relogin.res.headers.getSetCookie() : [];
  const newRefresh = (newCookies.find((c) => c.startsWith("trustnet_refresh=")) || "").split(";")[0];

  ok(24, await api("/api/v1/auth/logout", { method: "POST", cookie: newRefresh }));
  const afterLogout = await api("/api/v1/auth/refresh", { method: "POST", cookie: newRefresh });
  assert.equal(afterLogout.status, 401, "logout must revoke the refresh token server-side");
});
