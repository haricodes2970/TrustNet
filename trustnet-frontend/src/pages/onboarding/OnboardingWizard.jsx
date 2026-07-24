import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  User, 
  Rocket, 
  DollarSign, 
  GraduationCap, 
  Award, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Briefcase, 
  Globe, 
  Layers, 
  ShieldCheck, 
  Star, 
  TrendingUp, 
  Users 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { IdentityUploadCard } from '../../components/ui/IdentityUploadCard';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('Founder');
  
  // Credibility Profile State
  const [headline, setHeadline] = useState(currentUser?.headline || '');
  const [skills, setSkills] = useState(currentUser?.skills?.join(', ') || '');
  const [startupStage, setStartupStage] = useState('Idea');
  const [industry, setIndustry] = useState('Artificial Intelligence');
  const [fundingRequirement, setFundingRequirement] = useState('Not raising');
  const [revenue, setRevenue] = useState('Pre-revenue');
  const [country, setCountry] = useState('United States');
  const [experience, setExperience] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [partnershipAvailability, setPartnershipAvailability] = useState('Looking for co-founders');
  const [interests, setInterests] = useState(['AI', 'SaaS']);

  // Verification Documents State
  const [govIdFile, setGovIdFile] = useState(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [registrationFile, setRegistrationFile] = useState(null);

  const roles = [
    { title: 'Entrepreneur', desc: 'Starting a new venture or searching for co-founders', icon: Rocket },
    { title: 'Founder', desc: 'Leading an active startup team and raising capital', icon: User },
    { title: 'Investor', desc: 'Writing checks for Seed to Series A startups', icon: DollarSign },
    { title: 'Mentor', desc: 'Advising founders and sharing domain expertise', icon: Award },
  ];

  const startupStages = ['Idea', 'MVP', 'Customers/Traction', 'Revenue', 'Funding', 'Scale'];
  
  const partnershipOptions = [
    'Looking for co-founders',
    'Looking for advisors/mentors',
    'Open for hiring/collaboration',
    'Not available'
  ];

  const fundingLevels = [
    'Not raising',
    '<$100k',
    '$100k - $500k',
    '$500k - $2M',
    '$2M+'
  ];

  const revenueLevels = [
    'Pre-revenue',
    '<$10k/month',
    '$10k - $50k/month',
    '$50k+/month'
  ];

  const interestTags = [
    'AI', 'Healthcare', 'Fintech', 'EdTech', 'Blockchain', 'Cybersecurity', 
    'Marketing', 'Agriculture', 'SaaS', 'Climate', 'Developer Tools', 'Robotics'
  ];

  const handleNext = () => {
    if (step < 4) {
      if (step === 3) {
        // Trigger celebratory confetti on final step selection
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      setStep(step + 1);
    } else {
      // Save all credibility fields matching user profile requirements
      updateUserProfile({
        role: selectedRole,
        headline: headline || `${selectedRole} @ Ecosystem`,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        startupStage,
        industry,
        fundingRequirement,
        revenue,
        country,
        experience,
        portfolioLink,
        partnershipAvailability,
        interests,
        linkedinUrl,
        websiteUrl,
        isVerified: false
      });
      navigate(`/app/dashboard?role=${selectedRole.toLowerCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-soft-lg border border-slate-200 p-6 sm:p-10">
        
        {/* Progress Tracker */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>STEP {step} OF 4</span>
            <span className="text-emerald-600 font-bold">{step * 25}% Completed</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: '25%' }}
              animate={{ width: `${step * 25}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Wizard Steps */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Choose Your Role</h2>
                <p className="text-xs text-slate-500 mt-1">Select the role that best defines your focus in FounderVerse AI.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.title;
                  return (
                    <div
                      key={r.title}
                      onClick={() => setSelectedRole(r.title)}
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-soft-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900">{r.title}</h4>
                        <p className="text-xs text-slate-500">{r.desc}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Business Credibility Profile</h2>
                <p className="text-xs text-slate-500 mt-1">Provide accurate business metrics to showcase professional credibility.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <Input
                    label="Professional Headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Founder & CEO @ NexusAI | Building Workflow AI"
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Core Skills (Comma Separated)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="React, Python, Machine Learning, Product Strategy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Industry Sector</label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      >
                        {interestTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Country</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="United States"
                      />
                    </div>
                  </div>

                  {(selectedRole === 'Founder' || selectedRole === 'Entrepreneur') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Startup Stage</label>
                        <select
                          value={startupStage}
                          onChange={(e) => setStartupStage(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        >
                          {startupStages.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Availability for Partnership</label>
                        <select
                          value={partnershipAvailability}
                          onChange={(e) => setPartnershipAvailability(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        >
                          {partnershipOptions.map(po => (
                            <option key={po} value={po}>{po}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(selectedRole === 'Founder' || selectedRole === 'Entrepreneur') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Funding Requirement</label>
                        <select
                          value={fundingRequirement}
                          onChange={(e) => setFundingRequirement(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        >
                          {fundingLevels.map(fl => (
                            <option key={fl} value={fl}>{fl}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Current Revenue</label>
                        <select
                          value={revenue}
                          onChange={(e) => setRevenue(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        >
                          {revenueLevels.map(rl => (
                            <option key={rl} value={rl}>{rl}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Pitch Deck or Portfolio URL"
                    value={portfolioLink}
                    onChange={(e) => setPortfolioLink(e.target.value)}
                    placeholder="https://pitch.com/yourdeck"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Professional Experience Summary</label>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="Briefly describe your startup experience, previous companies, or academic achievements..."
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verify Your Identity</h2>
                <p className="text-xs text-slate-500 mt-1">Upload files and paste profile URLs to verify your business credentials.</p>
              </div>

              {/* Upload Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Row 1 */}
                <IdentityUploadCard 
                  title="Government ID" 
                  subtitle="Passport, driver's license, or national ID" 
                  icon={ShieldCheck} 
                  onFileSelect={setGovIdFile}
                />
                <IdentityUploadCard 
                  title="LinkedIn" 
                  subtitle="Your public LinkedIn profile URL" 
                  icon={Users} 
                  isUrlInput={true}
                  urlValue={linkedinUrl}
                  onUrlChange={setLinkedinUrl}
                  placeholder="https://linkedin.com/in/yourusername"
                />

                {/* Row 2 */}
                <IdentityUploadCard 
                  title="Business Website" 
                  subtitle="Link to your official company website" 
                  icon={Globe} 
                  isUrlInput={true}
                  urlValue={websiteUrl}
                  onUrlChange={setWebsiteUrl}
                  placeholder="https://yourcompany.com"
                />
                <div className="hidden md:block" />

                {/* Row 3 */}
                <IdentityUploadCard 
                  title="Startup Registration" 
                  subtitle="Startup registration documents, if applicable" 
                  icon={Rocket} 
                  onFileSelect={setRegistrationFile}
                />
                <div className="hidden md:block" />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 space-y-6 max-w-md mx-auto"
            >
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-soft-lg animate-bounce">
                <Sparkles className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ecosystem Profile Ready</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your business credibility credentials are now verified and active. You are set to collaborate, pitch, hire, and connect.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Assigned Plan:</span>
                  <span className="text-emerald-700 font-black uppercase text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
                    Free
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Ecosystem Persona:</span>
                  <span className="text-slate-600 font-semibold">{selectedRole}</span>
                </div>
                {(govIdFile || linkedinUrl) && (
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 pt-1 border-t border-emerald-200/50">
                    <span>Identity Verified:</span>
                    <span>Yes (Credentials Verified)</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
          {step > 1 && step < 4 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          ) : <div />}

          <Button variant="primary" size="md" onClick={handleNext}>
            <span>{step === 4 ? 'Enter Dashboard' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
