import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Trash2, 
  Save, 
  Building, 
  MapPin, 
  Globe, 
  Briefcase, 
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Link
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { VerificationBadge } from '../../components/ui/VerificationBadge';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { BASE_URL, getToken } from '../../lib/apiClient';

export const EditProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile, authState } = useAuth();
  const { showToast } = useApp();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    location: '',
    website: '',
    linkedin: '',
    avatar: ''
  });

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const fetchProfile = async () => {
    setIsPageLoading(true);
    setPageError('');
    try {
      const response = await fetch(`${BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Failed to fetch profile details.');
      }
      const data = res.data;
      setFormData({
        name: data.fullName || '',
        headline: data.designation || '',
        bio: data.bio || '',
        location: data.location || '',
        website: data.websiteUrl || '',
        linkedin: data.linkedin || '',
        avatar: data.avatarUrl || ''
      });
    } catch (err) {
      setPageError(err.message || 'Failed to load profile details.');
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum avatar size is 5MB.', 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Invalid Format', 'Supported formats: JPG, PNG, WebP.', 'error');
      return;
    }

    setIsUploading(true);
    const token = getToken();
    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const response = await fetch(`${BASE_URL}/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fd
      });
      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Failed to upload avatar.');
      }
      setFormData(prev => ({ ...prev, avatar: res.data.avatar }));
      setIsDirty(true);
      showToast('Avatar Uploaded', 'Your profile picture has been updated.', 'success');
    } catch (err) {
      showToast('Upload Failed', err.message || 'Could not upload profile picture.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setIsUploading(true);
    const token = getToken();
    try {
      const response = await fetch(`${BASE_URL}/profile/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Failed to remove avatar.');
      }
      setFormData(prev => ({ ...prev, avatar: '' }));
      setIsDirty(true);
      showToast('Avatar Removed', 'Profile picture removed.', 'success');
    } catch (err) {
      showToast('Action Failed', err.message || 'Could not remove profile picture.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (isSaving) return;

    if (!formData.name.trim()) {
      showToast('Validation Error', 'Full Name is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          fullName: formData.name,
          designation: formData.headline,
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          linkedin: formData.linkedin,
          avatar: formData.avatar
        })
      });
      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Failed to save profile changes.');
      }
      showToast('Profile Saved', 'Your profile details have been updated.', 'success');
      
      if (updateUserProfile) {
        updateUserProfile(res.data);
      }
      
      setIsDirty(false);
      navigate('/app/profile');
    } catch (err) {
      showToast('Save Failed', err.message || 'Could not update profile details.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsDirty(false);
    showToast('Changes Discarded', 'Your unsaved profile edits have been reset.', 'info');
    navigate('/app/profile');
  };

  if (authState === 'initializing' || isPageLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-500">Loading edit profile form...</p>
      </div>
    );
  }

  if (pageError || !currentUser) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center p-6">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Failed to Load Form</h2>
        <p className="text-xs text-slate-500">{pageError || 'An unexpected error occurred.'}</p>
        <Button variant="outline" size="md" onClick={fetchProfile} className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-20">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleCancel}
          disabled={isSaving}
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
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Avatar Section */}
          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
              Profile Photo
            </h3>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Avatar Image</label>
                <div className="flex gap-4 items-center flex-wrap">
                  <Avatar src={formData.avatar} size="xl" isVerified={currentUser.isVerified} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarUpload} 
                        accept="image/jpeg,image/png,image/webp" 
                        className="hidden" 
                      />
                      <Button 
                        type="button" 
                        variant="primary" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSaving || isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Change Photo'}
                      </Button>
                      {formData.avatar && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={handleAvatarRemove}
                          disabled={isSaving || isUploading}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">JPG, PNG or WebP up to 5MB.</p>
                  </div>
                </div>
              </div>

              <Input
                label="Avatar Image URL (Alternative Link)"
                value={formData.avatar}
                onChange={(e) => handleInputChange('avatar', e.target.value)}
                disabled={isSaving || isUploading}
              />
            </div>
          </Card>

          {/* Basic Info */}
          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Basic Info</h3>

            <div className="space-y-4 pt-2">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isSaving}
                required
              />

              <Input
                label="Professional Headline"
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value.slice(0, 100))}
                disabled={isSaving}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bio (Max 500 characters)</label>
                <textarea
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value.slice(0, 500))}
                  disabled={isSaving}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </Card>

          {/* Location & External Links */}
          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Location & Social Profiles</h3>

            <div className="space-y-4 pt-2">
              <Input
                label="Location (City, Country)"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value.slice(0, 100))}
                disabled={isSaving}
              />

              <Input
                label="Website URL"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                disabled={isSaving}
              />

              <Input
                label="LinkedIn Profile URL"
                value={formData.linkedin}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </Card>
        </form>

        {/* Right Sticky Preview (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                Unsaved Preview Card
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">Real-time</span>
            </div>

            <Card className="border-slate-200/80 bg-white shadow-soft-sm overflow-hidden">
              <div className="h-32 w-full bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-100 relative" />

              <div className="p-6 relative pt-0">
                <div className="flex items-end justify-between -mt-12 mb-4">
                  <Avatar src={formData.avatar} alt={formData.name} size="xl" isVerified={currentUser.isVerified} className="ring-4 ring-white shadow-md bg-white" />
                  <Badge variant="emerald" className="capitalize">{currentUser.role}</Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    {formData.name || 'Your Name'}
                    {currentUser.isVerified && (
                      <VerificationBadge size="md" className="ml-1.5" />
                    )}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600">{formData.headline || 'Your Headline'}</p>
                  
                  {formData.location && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{formData.location}</span>
                    </p>
                  )}

                  {formData.bio && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 pt-1 border-t border-slate-50">{formData.bio}</p>
                  )}
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
            {isDirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Unsaved changes pending</span>
              </>
            ) : (
              <span>All changes saved</span>
            )}
          </span>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
              <span>Cancel</span>
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
              <Save className="w-4 h-4" strokeWidth={1.75} />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
