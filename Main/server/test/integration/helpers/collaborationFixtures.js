const Startup = require("../../../src/models/Startup");
const Workspace = require("../../../src/models/Workspace");
const Team = require("../../../src/models/Team");
const Project = require("../../../src/models/Project");
const { createAuthenticatedTestUser } = require("./testUser");

// Shared building block: five users (founder, active Team admin, active Team
// member/contributor, a pending/"inactive" member, and a fully unrelated
// user) plus a Startup and a Team. Used by both fixtures below.
async function createStartupAndTeam() {
  const founder = await createAuthenticatedTestUser({ role: "founder" });
  const adminMember = await createAuthenticatedTestUser({ role: "builder" });
  const contributorMember = await createAuthenticatedTestUser({ role: "builder" });
  const pendingMember = await createAuthenticatedTestUser({ role: "builder" });
  const unrelatedUser = await createAuthenticatedTestUser({ role: "builder" });

  const unique = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  const startup = await Startup.create({
    founder: founder.user._id,
    name: "Fixture Startup",
    slug: `fixture-startup-${unique}`,
    description: "A".repeat(60),
    category: "SaaS",
  });

  const team = await Team.create({
    startup: startup._id,
    name: "Fixture Team",
    owner: founder.user._id,
    members: [
      {
        user: founder.user._id,
        email: founder.user.email,
        role: "admin",
        status: "active",
        invitedBy: founder.user._id,
        joinedAt: new Date(),
      },
      {
        user: adminMember.user._id,
        email: adminMember.user.email,
        role: "admin",
        status: "active",
        invitedBy: founder.user._id,
        joinedAt: new Date(),
      },
      {
        user: contributorMember.user._id,
        email: contributorMember.user.email,
        role: "member",
        status: "active",
        invitedBy: founder.user._id,
        joinedAt: new Date(),
      },
      {
        user: pendingMember.user._id,
        email: pendingMember.user.email,
        role: "member",
        status: "pending", // invited, not yet accepted — the only non-"active" status this schema supports
        invitedBy: founder.user._id,
      },
    ],
    memberCount: 4,
  });

  return { founder, adminMember, contributorMember, pendingMember, unrelatedUser, startup, team };
}

// Builds one full Startup -> Workspace -> Team -> Project chain. Shared
// across the Workspace/Project/Task/Milestone/Document permission
// integration tests so each test file doesn't hand-roll the same fixture.
async function createCollaborationFixture() {
  const base = await createStartupAndTeam();

  const workspace = await Workspace.create({
    startup: base.startup._id,
    name: "Fixture Workspace",
    owner: base.founder.user._id,
  });

  const project = await Project.create({
    workspace: workspace._id,
    name: "Fixture Project",
    owner: base.founder.user._id,
  });

  return { ...base, workspace, project };
}

// Builds Startup + Team only — deliberately NO Workspace, NO Project. Used
// by the Hiring module's integration tests to prove Job authorization is
// genuinely independent of Workspace/Project ever existing for that
// Startup, not merely untested against that case.
async function createStartupTeamFixture() {
  return createStartupAndTeam();
}

module.exports = { createCollaborationFixture, createStartupTeamFixture };
