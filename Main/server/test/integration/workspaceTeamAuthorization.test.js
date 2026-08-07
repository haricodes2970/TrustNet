// Workspace + Team integration tests. Runs the real Express app over HTTP
// against an in-memory MongoDB instance. Out of scope: real email delivery
// - this repo's .env has live SMTP credentials (see authAuthorization.
// test.js), and unlike the auth flows, teamService.inviteMember has no
// email-free code path to test around. emailService.sendEmail is stubbed
// below BEFORE `app` (and therefore teamService, which destructures
// sendEmail at require time) is ever required, so every invite in this
// file resolves instantly instead of hanging on a real SMTP handshake.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");

const emailService = require("../../src/services/email.service");
emailService.sendEmail = async () => {};

const app = require("../../app");
const Startup = require("../../src/models/Startup");
const Team = require("../../src/models/Team");
const Workspace = require("../../src/models/Workspace");
const User = require("../../src/models/User");

let server;
let baseUrl;

before(async () => {
  await setupTestDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function makeAdmin() {
  return createAuthenticatedTestUser({ role: "admin" });
}

// ============================== WORKSPACE ==============================

test("create workspace rejects unauthenticated", async () => {
  const { status } = await api("/api/v1/workspaces", { method: "POST", body: { startupId: "x", name: "W" } });
  assert.equal(status, 401);
});

test("founder creates a workspace for their own startup", async () => {
  const fx = await createCollaborationFixture(); // already has a workspace
  const founder2 = await createAuthenticatedTestUser({ role: "founder" });
  const startup2 = await Startup.create({
    founder: founder2.user._id,
    name: "Second Startup",
    slug: `second-startup-${Date.now()}`,
    description: "B".repeat(60),
    category: "Fintech",
  });

  const { status, json } = await api("/api/v1/workspaces", {
    method: "POST",
    token: founder2.token,
    body: { startupId: String(startup2._id), name: "New Workspace" },
  });
  assert.equal(status, 201);
  assert.equal(String(json.data.owner), String(founder2.user._id));
  assert.ok(fx.workspace);
});

test("non-founder cannot create a workspace for someone else's startup (403, not 400 - regression)", async () => {
  const fx = await createCollaborationFixture();
  const { status, json } = await api("/api/v1/workspaces", {
    method: "POST",
    token: fx.unrelatedUser.token,
    body: { startupId: String(fx.startup._id), name: "Hijack Workspace" },
  });
  assert.equal(status, 403);
  assert.match(json.message, /not authorized/i);
});

test("duplicate workspace for the same startup returns 409 with a friendly message", async () => {
  const fx = await createCollaborationFixture(); // already has a workspace
  const { status, json } = await api("/api/v1/workspaces", {
    method: "POST",
    token: fx.founder.token,
    body: { startupId: String(fx.startup._id), name: "Duplicate" },
  });
  assert.equal(status, 409);
  assert.match(json.message, /already exists/i);
});

test("a platform admin can create a workspace for a startup they have no relation to", async () => {
  const founder2 = await createAuthenticatedTestUser({ role: "founder" });
  const startup2 = await Startup.create({
    founder: founder2.user._id,
    name: "Admin-Created Startup",
    slug: `admin-created-${Date.now()}`,
    description: "C".repeat(60),
    category: "Healthtech",
  });
  const admin = await makeAdmin();

  const { status } = await api("/api/v1/workspaces", {
    method: "POST",
    token: admin.token,
    body: { startupId: String(startup2._id), name: "Admin Workspace" },
  });
  assert.equal(status, 201);
});

test("creating a workspace against a soft-deleted startup is blocked", async () => {
  const founder = await createAuthenticatedTestUser({ role: "founder" });
  const startup = await Startup.create({
    founder: founder.user._id,
    name: "Deleted Startup",
    slug: `deleted-startup-${Date.now()}`,
    description: "D".repeat(60),
    category: "SaaS",
    deletedAt: new Date(),
  });

  const { status, json } = await api("/api/v1/workspaces", {
    method: "POST",
    token: founder.token,
    body: { startupId: String(startup._id), name: "Should Fail" },
  });
  assert.equal(status, 409);
  assert.match(json.message, /deleted/i);
});

test("get workspace returns 404 for a nonexistent id, not 403 (regression)", async () => {
  const fx = await createCollaborationFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const { status } = await api(`/api/v1/workspaces/${fakeId}`, { token: fx.founder.token });
  assert.equal(status, 404);
});

test("get workspace returns 403 for an authenticated but unrelated user", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api(`/api/v1/workspaces/${fx.workspace._id}`, { token: fx.unrelatedUser.token });
  assert.equal(status, 403);
});

test("a member of the startup's SECOND team can access the workspace (regression: Team.findOne only checked one team)", async () => {
  const fx = await createCollaborationFixture();
  const secondTeamAdmin = await createAuthenticatedTestUser({ role: "builder" });

  await Team.create({
    startup: fx.startup._id,
    name: "Second Team",
    owner: fx.founder.user._id,
    members: [
      {
        user: fx.founder.user._id,
        email: fx.founder.user.email,
        role: "admin",
        status: "active",
        invitedBy: fx.founder.user._id,
        joinedAt: new Date(),
      },
      {
        user: secondTeamAdmin.user._id,
        email: secondTeamAdmin.user.email,
        role: "admin",
        status: "active",
        invitedBy: fx.founder.user._id,
        joinedAt: new Date(),
      },
    ],
    memberCount: 2,
  });

  const { status } = await api(`/api/v1/workspaces/${fx.workspace._id}`, { token: secondTeamAdmin.token });
  assert.equal(status, 200);
});

test("list workspaces returns those owned or team-member-active, excludes unrelated", async () => {
  const fx = await createCollaborationFixture();
  const owned = await api("/api/v1/workspaces", { token: fx.founder.token });
  assert.ok(owned.json.data.some((w) => w._id === String(fx.workspace._id)));

  const unrelated = await api("/api/v1/workspaces", { token: fx.unrelatedUser.token });
  assert.ok(!unrelated.json.data.some((w) => w._id === String(fx.workspace._id)));
});

test("update: owner and admin-tier team member succeed, contributor is rejected, platform admin succeeds", async () => {
  const fx = await createCollaborationFixture();
  const admin = await makeAdmin();

  const byOwner = await api(`/api/v1/workspaces/${fx.workspace._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { description: "Updated by owner" },
  });
  assert.equal(byOwner.status, 200);

  const byTeamAdmin = await api(`/api/v1/workspaces/${fx.workspace._id}`, {
    method: "PUT",
    token: fx.adminMember.token,
    body: { description: "Updated by team admin" },
  });
  assert.equal(byTeamAdmin.status, 200);

  const byContributor = await api(`/api/v1/workspaces/${fx.workspace._id}`, {
    method: "PUT",
    token: fx.contributorMember.token,
    body: { description: "Should fail" },
  });
  assert.equal(byContributor.status, 403);

  const byPlatformAdmin = await api(`/api/v1/workspaces/${fx.workspace._id}`, {
    method: "PUT",
    token: admin.token,
    body: { description: "Updated by platform admin" },
  });
  assert.equal(byPlatformAdmin.status, 200);
});

test("archive then restore a workspace (owner-only for archive)", async () => {
  const fx = await createCollaborationFixture();

  const byTeamAdmin = await api(`/api/v1/workspaces/${fx.workspace._id}`, { method: "DELETE", token: fx.adminMember.token });
  assert.equal(byTeamAdmin.status, 403); // team-admin tier cannot archive, owner-only

  const archived = await api(`/api/v1/workspaces/${fx.workspace._id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);

  const updateWhileArchived = await api(`/api/v1/workspaces/${fx.workspace._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { description: "should fail" },
  });
  assert.equal(updateWhileArchived.status, 409);

  const restored = await api(`/api/v1/workspaces/${fx.workspace._id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);
});

test("restoring a workspace is blocked while its startup is still soft-deleted", async () => {
  const fx = await createCollaborationFixture();
  await api(`/api/v1/workspaces/${fx.workspace._id}`, { method: "DELETE", token: fx.founder.token });
  await Startup.findByIdAndUpdate(fx.startup._id, { deletedAt: new Date() });

  const { status, json } = await api(`/api/v1/workspaces/${fx.workspace._id}/restore`, {
    method: "POST",
    token: fx.founder.token,
  });
  assert.equal(status, 409);
  assert.match(json.message, /startup/i);
});

test("soft-deleting a startup cascade-archives its workspace and team", async () => {
  const fx = await createCollaborationFixture();

  await api(`/api/v1/startups/${fx.startup._id}`, { method: "DELETE", token: fx.founder.token });

  const workspace = await Workspace.findById(fx.workspace._id).lean();
  const team = await Team.findById(fx.team._id).lean();
  assert.equal(workspace.isArchived, true);
  assert.equal(team.isArchived, true);
});

test("listMembers merges rosters across all of a startup's teams and dedupes", async () => {
  const fx = await createCollaborationFixture();
  const secondTeamContributor = await createAuthenticatedTestUser({ role: "builder" });

  await Team.create({
    startup: fx.startup._id,
    name: "Second Team",
    owner: fx.founder.user._id,
    members: [
      { user: fx.founder.user._id, email: fx.founder.user.email, role: "admin", status: "active", invitedBy: fx.founder.user._id, joinedAt: new Date() },
      { user: secondTeamContributor.user._id, email: secondTeamContributor.user.email, role: "member", status: "active", invitedBy: fx.founder.user._id, joinedAt: new Date() },
    ],
    memberCount: 2,
  });

  const { status, json } = await api(`/api/v1/workspaces/${fx.workspace._id}/members`, { token: fx.founder.token });
  assert.equal(status, 200);
  const ids = json.data.map((m) => String(m.user));
  assert.equal(ids.filter((id) => id === String(fx.founder.user._id)).length, 1); // owner, not duplicated
  assert.ok(ids.includes(String(secondTeamContributor.user._id)));
});

test("listMembers rejects an unrelated user with 403, not 400 (regression)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api(`/api/v1/workspaces/${fx.workspace._id}/members`, { token: fx.unrelatedUser.token });
  assert.equal(status, 403);
});

// ================================ TEAM ==================================

test("create team rejects a non-founder (403)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api("/api/v1/teams", {
    method: "POST",
    token: fx.unrelatedUser.token,
    body: { startupId: String(fx.startup._id), name: "Rogue Team" },
  });
  assert.equal(status, 403);
});

test("creating a team against a soft-deleted startup is blocked", async () => {
  const founder = await createAuthenticatedTestUser({ role: "founder" });
  const startup = await Startup.create({
    founder: founder.user._id,
    name: "Deleted Startup 2",
    slug: `deleted-startup-2-${Date.now()}`,
    description: "E".repeat(60),
    category: "SaaS",
    deletedAt: new Date(),
  });
  const { status } = await api("/api/v1/teams", {
    method: "POST",
    token: founder.token,
    body: { startupId: String(startup._id), name: "Should Fail" },
  });
  assert.equal(status, 409);
});

test("get team returns 404 for nonexistent, 403 for unrelated user", async () => {
  const fx = await createCollaborationFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const notFound = await api(`/api/v1/teams/${fakeId}`, { token: fx.founder.token });
  assert.equal(notFound.status, 404);

  const unauthorized = await api(`/api/v1/teams/${fx.team._id}`, { token: fx.unrelatedUser.token });
  assert.equal(unauthorized.status, 403);
});

test("update team is owner-only - an admin-tier member cannot update team metadata", async () => {
  const fx = await createCollaborationFixture();
  const byTeamAdmin = await api(`/api/v1/teams/${fx.team._id}`, {
    method: "PUT",
    token: fx.adminMember.token,
    body: { description: "should fail" },
  });
  assert.equal(byTeamAdmin.status, 403);

  const byOwner = await api(`/api/v1/teams/${fx.team._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { description: "ok" },
  });
  assert.equal(byOwner.status, 200);
});

test("a platform admin can update, archive and restore someone else's team", async () => {
  const fx = await createCollaborationFixture();
  const admin = await makeAdmin();

  const updated = await api(`/api/v1/teams/${fx.team._id}`, { method: "PUT", token: admin.token, body: { description: "admin edit" } });
  assert.equal(updated.status, 200);

  const archived = await api(`/api/v1/teams/${fx.team._id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);

  const restored = await api(`/api/v1/teams/${fx.team._id}/restore`, { method: "POST", token: admin.token });
  assert.equal(restored.status, 200);
});

test("invite: owner and admin-tier member can invite, plain member cannot (permission matrix regression)", async () => {
  const fx = await createCollaborationFixture();

  const byMember = await api(`/api/v1/teams/${fx.team._id}/members`, {
    method: "POST",
    token: fx.contributorMember.token,
    body: { email: "newperson1@example.com" },
  });
  assert.equal(byMember.status, 403);

  const byTeamAdmin = await api(`/api/v1/teams/${fx.team._id}/members`, {
    method: "POST",
    token: fx.adminMember.token,
    body: { email: "newperson2@example.com" },
  });
  assert.equal(byTeamAdmin.status, 201);

  const byOwner = await api(`/api/v1/teams/${fx.team._id}/members`, {
    method: "POST",
    token: fx.founder.token,
    body: { email: "newperson3@example.com" },
  });
  assert.equal(byOwner.status, 201);
});

test("invite rejects a duplicate email with 409", async () => {
  const fx = await createCollaborationFixture();
  const email = "dupe@example.com";
  const first = await api(`/api/v1/teams/${fx.team._id}/members`, { method: "POST", token: fx.founder.token, body: { email } });
  assert.equal(first.status, 201);

  const { status, json } = await api(`/api/v1/teams/${fx.team._id}/members`, { method: "POST", token: fx.founder.token, body: { email } });
  assert.equal(status, 409);
  assert.match(json.message, /already been invited/i);
});

test("accept invite: correct invitee succeeds, wrong user is rejected, re-accepting is rejected", async () => {
  const fx = await createCollaborationFixture();
  const invited = await createAuthenticatedTestUser({ role: "builder", email: "invitee@example.com" });

  const invite = await api(`/api/v1/teams/${fx.team._id}/members`, {
    method: "POST",
    token: fx.founder.token,
    body: { email: invited.user.email },
  });
  const memberId = invite.json.data.member._id;

  const wrongUser = await api(`/api/v1/teams/${fx.team._id}/members/${memberId}/accept`, { method: "PUT", token: fx.unrelatedUser.token });
  assert.equal(wrongUser.status, 403);

  const accepted = await api(`/api/v1/teams/${fx.team._id}/members/${memberId}/accept`, { method: "PUT", token: invited.token });
  assert.equal(accepted.status, 200);

  const again = await api(`/api/v1/teams/${fx.team._id}/members/${memberId}/accept`, { method: "PUT", token: invited.token });
  assert.equal(again.status, 409);
});

test("removeMember: team-admin can remove a non-owner (regression), owner is protected from removal", async () => {
  const fx = await createCollaborationFixture();
  const team = await Team.findById(fx.team._id).lean();

  const ownerRecord = team.members.find((m) => String(m.user) === String(fx.founder.user._id));
  const removeOwner = await api(`/api/v1/teams/${fx.team._id}/members/${ownerRecord._id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(removeOwner.status, 403);

  const contributorRecord = team.members.find((m) => String(m.user) === String(fx.contributorMember.user._id));
  const byTeamAdmin = await api(`/api/v1/teams/${fx.team._id}/members/${contributorRecord._id}`, {
    method: "DELETE",
    token: fx.adminMember.token,
  });
  assert.equal(byTeamAdmin.status, 200);
});

test("removeMember: a plain member can leave (remove themselves) but not remove a peer", async () => {
  const fx = await createCollaborationFixture();
  const team = await Team.findById(fx.team._id).lean();
  const pendingRecordSelf = team.members.find((m) => String(m.user) === String(fx.contributorMember.user._id));
  const adminRecord = team.members.find((m) => String(m.user) === String(fx.adminMember.user._id));

  const removePeer = await api(`/api/v1/teams/${fx.team._id}/members/${adminRecord._id}`, {
    method: "DELETE",
    token: fx.contributorMember.token,
  });
  assert.equal(removePeer.status, 403);

  const leave = await api(`/api/v1/teams/${fx.team._id}/members/${pendingRecordSelf._id}`, {
    method: "DELETE",
    token: fx.contributorMember.token,
  });
  assert.equal(leave.status, 200);
});

test("changeMemberRole: owner-only, an admin-tier member cannot grant roles (escalation prevention regression)", async () => {
  const fx = await createCollaborationFixture();
  const team = await Team.findById(fx.team._id).lean();
  const contributorRecord = team.members.find((m) => String(m.user) === String(fx.contributorMember.user._id));

  const byTeamAdmin = await api(`/api/v1/teams/${fx.team._id}/members/${contributorRecord._id}/role`, {
    method: "PUT",
    token: fx.adminMember.token,
    body: { role: "admin" },
  });
  assert.equal(byTeamAdmin.status, 403);

  const byOwner = await api(`/api/v1/teams/${fx.team._id}/members/${contributorRecord._id}/role`, {
    method: "PUT",
    token: fx.founder.token,
    body: { role: "admin" },
  });
  assert.equal(byOwner.status, 200);
});

test("changeMemberRole succeeds for a platform admin", async () => {
  const fx = await createCollaborationFixture();
  const admin = await makeAdmin();
  const team = await Team.findById(fx.team._id).lean();
  const contributorRecord = team.members.find((m) => String(m.user) === String(fx.contributorMember.user._id));

  const { status } = await api(`/api/v1/teams/${fx.team._id}/members/${contributorRecord._id}/role`, {
    method: "PUT",
    token: admin.token,
    body: { role: "admin" },
  });
  assert.equal(status, 200);
});

test("a suspended team-admin is blocked at the auth layer before any team-permission check runs", async () => {
  const fx = await createCollaborationFixture();
  await User.findByIdAndUpdate(fx.adminMember.user._id, { isActive: false });

  const { status } = await api(`/api/v1/teams/${fx.team._id}/members`, {
    method: "POST",
    token: fx.adminMember.token,
    body: { email: "shouldnotwork@example.com" },
  });
  assert.equal(status, 403);
});
