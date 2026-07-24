import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Building, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  Briefcase, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const EditProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuth();
  const { showToast } = useApp();

  const [formData, setFormData] = useState({
    name: currentUser?.name || 'Alex Morgan',
    headline: currentUser?.headline || 'Founder & CEO @ NexusAI | YC W24 Alum',
    bio: currentUser?.bio || 'Building the next-generation autonomous AI workflow platform.',
    role: currentUser?.role || 'Founder',
    organization: currentUser?.organization || 'NexusAI',
    city: currentUser?.city || 'San Francisco, CA',
    country: currentUser?.country || 'United States',
    website: currentUser?.website || 'https://nexusai.io',
    avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    cover: currentUser?.cover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
    skills: currentUser?.skills || ['Artificial Intelligence', 'SaaS', 'Venture Capital', 'Product Strategy'],
    interests: currentUser?.interests || ['AI', 'SaaS', 'Fintech'],
    experience: currentUser?.experience || [
      { title: 'Founder & CEO', company: 'NexusAI', period: '2023 - Present', description: 'Scaling autonomous AI agents for enterprise operations.' }
    ]
  });

  const [newSkill, setNewSkill] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (formData.skills.includes(newSkill.trim())) return;
    setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
    setNewSkill('');
    setIsDirty(true);
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }));
    setIsDirty(true);
  };

  const handleSave = (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      if (updateCurrentUser) updateCurrentUser(formData);
      setIsSaving(false);
      setIsDirty(false);
      showToast('Profile Saved', 'Profile details updated.', 'success');
      navigate('/app/profile');
    }, 800);
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-20">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/profile')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Back to Profile</span>
        </button>

        <Badge variant="emerald">Live Preview Active</Badge>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
              Profile Photos & Cover
            </h3>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Avatar Image URL</label>
                <div className="flex gap-3 items-center">
                  <Avatar src={formData.avatar} size="lg" isVerified />
                  <Input
                    value={formData.avatar}
                    onChange={(e) => handleInputChange('avatar', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <Input
                label="Cover Banner URL"
                value={formData.cover}
                onChange={(e) => handleInputChange('cover', e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Basic Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Role / Persona</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  <option value="Founder">Founder</option>
                  <option value="Entrepreneur">Entrepreneur</option>
                  <option value="Investor">Investor</option>
                  <option value="Mentor">Mentor</option>
                </select>
              </div>
            </div>

            <Input
              label="Professional Headline"
              value={formData.headline}
              onChange={(e) => handleInputChange('headline', e.target.value.slice(0, 120))}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bio</label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value.slice(0, 280))}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
              />
            </div>
          </Card>

          {/* Skills Manager */}
          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>Skills & Expertise</span>
              <span className="text-xs text-slate-400 font-normal">{formData.skills.length} skills</span>
            </h3>

            <div className="flex gap-2 pt-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a new skill"
                className="flex-1"
              />
              <Button type="button" variant="primary" onClick={handleAddSkill}>
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                <span>Add</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {formData.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {skill}
                  <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-slate-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Sticky Preview (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                Public Profile Card Preview
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">Real-time</span>
            </div>

            <Card className="border-slate-200/80 bg-white hoverEffect">
              <div className="h-32 w-full bg-slate-100 relative">
                <img src={formData.cover} alt="Cover Preview" className="w-full h-full object-cover" />
              </div>

              <div className="p-6 relative pt-0">
                <div className="flex items-end justify-between -mt-12 mb-4">
                  <Avatar src={formData.avatar} alt={formData.name} size="xl" isVerified className="ring-4 ring-white shadow-md bg-white" />
                  <Badge variant="emerald">{formData.role}</Badge>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{formData.name || 'Your Name'}</h3>
                  <p className="text-xs font-semibold text-slate-600 mt-1">{formData.headline || 'Your Headline'}</p>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-3">{formData.bio}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-3.5 px-6 z-40 shadow-soft-lg">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Unsaved changes
          </span>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/app/profile')}>
              <span>Cancel</span>
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4" strokeWidth={1.75} />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
