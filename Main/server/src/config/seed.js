const User = require("../models/User");
const InvestorProfile = require("../models/InvestorProfile");
const Startup = require("../models/Startup");
const FundingRound = require("../models/FundingRound");
const bcrypt = require("bcryptjs");

async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log("[Seed] Database already contains data. Skipping seeding.");
      return;
    }

    console.log("[Seed] Starting database seeding...");

    // 1. Create Users
    const adminPasswordHash = await bcrypt.hash("Admin@trustnet", 10);
    const admin = await User.create({
      fullName: "TrustNet Administrator",
      username: "admin_trustnet",
      email: "trustnet929@gmail.com",
      password: adminPasswordHash,
      role: "admin",
      designation: "Administrator",
      isVerified: true,
      emailVerified: true,
      verificationStatus: "approved",
      accountStatus: "APPROVED",
      onboardingCompleted: true,
    });

    const founderPasswordHash = await bcrypt.hash("Founder@123", 10);
    const founder = await User.create({
      fullName: "Alex Morgan",
      username: "alex_morgan",
      email: "alex@nexusai.io",
      password: founderPasswordHash,
      role: "founder",
      designation: "Founder",
      isVerified: true,
      emailVerified: true,
      verificationStatus: "approved",
      accountStatus: "APPROVED",
      onboardingCompleted: true,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    });

    const investorPasswordHash = await bcrypt.hash("Investor@123", 10);
    const investor = await User.create({
      fullName: "Sarah Chen",
      username: "sarah_chen",
      email: "sarah@nexusai.io",
      password: investorPasswordHash,
      role: "investor",
      designation: "Venture Partner",
      isVerified: true,
      emailVerified: true,
      verificationStatus: "approved",
      accountStatus: "APPROVED",
      onboardingCompleted: true,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    });

    console.log("[Seed] Users created successfully.");

    // 2. Create Investor Profile
    const investorProfile = await InvestorProfile.create({
      user: investor._id,
      organization: "Nexus Venture Partners",
      investmentThesis: "We invest in seed and early-stage AI, SaaS, and infrastructure startups.",
      preferredStages: ["early-stage", "growth"],
      preferredIndustries: ["AI & SaaS", "Developer Tools"],
      preferredRegions: ["North America", "Global"],
      createdBy: investor._id,
    });

    console.log("[Seed] Investor Profile created successfully.");

    // 3. Create Startup
    const startup = await Startup.create({
      founder: founder._id,
      name: "Nexus AI",
      slug: "nexus-ai",
      tagline: "Decentralized GPU Compute for LLMs",
      description: "Nexus AI aggregates idle workstation GPUs into a coherent low-latency cluster for LLM inferencing engines. Our platform allows developers to run machine learning models at a fraction of standard cost while maintaining high reliability and performance.",
      category: "AI & SaaS",
      stage: "early-stage",
      location: "San Francisco, CA",
      websiteUrl: "https://nexusai.io",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      fundingGoal: 2500000,
      fundingRaised: 1750000,
      status: "active",
      isPublic: true,
    });

    console.log("[Seed] Startup created successfully.");

    // 4. Create Funding Round
    await FundingRound.create({
      startup: startup._id,
      title: "Nexus AI Seed Round",
      roundType: "seed",
      targetAmount: 2500000,
      raisedAmount: 1750000,
      minimumContribution: 25000,
      status: "open",
      description: "Scaling our decentralized GPU coordination network and hiring key ML engineers.",
      createdBy: founder._id,
    });

    console.log("[Seed] Funding Round created successfully.");
    console.log("[Seed] Database seeding completed successfully.");
  } catch (error) {
    console.error("[Seed] Error seeding database:", error.message);
  }
}

module.exports = seedDatabase;
