import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import * as startupApi from '../../lib/startupApi';
import { normalizeStartup } from '../../lib/adapters/startupAdapter';

export const CreateStartupPage = () => {
  const navigate = useNavigate();
  const { setStartups, showToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !formData.slugEdited) {
      const generatedSlug = formData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name]);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'slug') {
        updated.slugEdited = true;
        // Clean slug input to match allowed pattern
        updated.slug = value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
      return updated;
    });

    // Clear field-specific error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Startup name must be at least 2 characters.';
    } else if (formData.name.length > 150) {
      newErrors.name = 'Startup name cannot exceed 150 characters.';
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!formData.slug) {
      newErrors.slug = 'Slug is required.';
    } else if (!slugRegex.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens.';
    } else if (formData.slug.length < 3 || formData.slug.length > 80) {
      newErrors.slug = 'Slug must be between 3 and 80 characters.';
    }

    if (!formData.category || formData.category.trim().length === 0) {
      newErrors.category = 'Category/industry is required.';
    } else if (formData.category.length > 50) {
      newErrors.category = 'Category cannot exceed 50 characters.';
    }

    if (!formData.description || formData.description.trim().length < 50) {
      newErrors.description = 'Description must be at least 50 characters.';
    } else if (formData.description.length > 5000) {
      newErrors.description = 'Description cannot exceed 5000 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        category: formData.category.trim()
      };

      const created = await startupApi.createStartup(payload);
      const normalized = normalizeStartup(created);
      
      // Update global AppContext startups list
      setStartups(prev => [normalized, ...prev]);

      setSuccessData(normalized);
      showToast('🚀 Startup Created!', `${normalized.name} has been successfully registered.`, 'success');
    } catch (err) {
      if (err.status === 409) {
        setApiError('A startup with this slug already exists. Please choose a unique slug.');
        setErrors(prev => ({ ...prev, slug: 'Slug already taken.' }));
      } else {
        setApiError(err.message || 'Failed to create startup. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="bg-[#F7F5EF] text-[#0E1A2B] font-sans p-6 sm:p-8 min-h-screen -m-6 sm:-m-8 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white p-8 rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] text-center space-y-6">
          <div className="w-16 h-16 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black text-[#0E1A2B] tracking-tight">
              Startup Created Successfully!
            </h2>
            <p className="text-xs text-[#5B6472]">
              <strong>{successData.name}</strong> is now registered.
            </p>
          </div>

          <div className="p-4 bg-[#F7F5EF] rounded-[4px] text-left border border-[#5B6472]/10 space-y-2 font-mono text-xs text-[#0E1A2B]">
            <div>
              <span className="text-[#5B6472] uppercase block text-[10px]">Slug ID</span>
              <span>{successData.slug}</span>
            </div>
            <div>
              <span className="text-[#5B6472] uppercase block text-[10px]">Category</span>
              <span>{successData.industry}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="primary"
              className="w-full bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
              onClick={() => navigate(`/app/startups/${successData.id}/manage`)}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full border border-[#5B6472]/30 text-[#0E1A2B] hover:bg-[#F7F5EF] rounded-[4px]"
              onClick={() => navigate('/app/startups')}
            >
              Back to Startups
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F5EF] text-[#0E1A2B] font-sans p-6 sm:p-8 min-h-screen -m-6 sm:-m-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/startups')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6472] hover:text-[#0E1A2B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Startups</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-black text-[#0E1A2B] tracking-tight">
            Create Startup Profile
          </h1>
          <p className="text-xs text-[#5B6472]">
            Register your venture by filling out the official details below. All fields are required.
          </p>
        </div>

        {apiError && (
          <div className="p-4 bg-[#B23A32]/10 border border-[#B23A32]/20 rounded-[4px] text-[#B23A32] text-xs font-mono flex items-start gap-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong className="block uppercase text-[10px] tracking-wider mb-0.5">Error</strong>
              {apiError}
            </div>
          </div>
        )}

        <Card className="bg-white p-6 sm:p-8 rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Startup Name */}
            <div className="space-y-1.5">
              <label htmlFor="startup-name" className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                Startup Name
              </label>
              <input
                id="startup-name"
                type="text"
                disabled={isSubmitting}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Acme Corporation"
                className={`w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border px-3.5 h-11 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] ${
                  errors.name ? 'border-[#B23A32] focus:ring-[#B23A32]/30 focus:border-[#B23A32]' : 'border-[#5B6472]/30'
                }`}
              />
              {errors.name && (
                <p className="text-xs text-[#B23A32] font-mono mt-1">{errors.name}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label htmlFor="startup-slug" className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                Slug (URL Identifier)
              </label>
              <input
                id="startup-slug"
                type="text"
                disabled={isSubmitting}
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="e.g. acme-corp"
                className={`w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border px-3.5 h-11 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] font-mono ${
                  errors.slug ? 'border-[#B23A32] focus:ring-[#B23A32]/30 focus:border-[#B23A32]' : 'border-[#5B6472]/30'
                }`}
              />
              <span className="text-[10px] font-mono text-[#5B6472] block">
                Live Preview: trustnet.com/app/startups/{formData.slug || 'slug-url'}
              </span>
              {errors.slug && (
                <p className="text-xs text-[#B23A32] font-mono mt-1">{errors.slug}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="startup-category" className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                Category / Industry
              </label>
              <input
                id="startup-category"
                type="text"
                disabled={isSubmitting}
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="e.g. AI & SaaS, Fintech, HealthTech"
                className={`w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border px-3.5 h-11 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] ${
                  errors.category ? 'border-[#B23A32] focus:ring-[#B23A32]/30 focus:border-[#B23A32]' : 'border-[#5B6472]/30'
                }`}
              />
              {errors.category && (
                <p className="text-xs text-[#B23A32] font-mono mt-1">{errors.category}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="startup-description" className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                Description (min. 50 characters)
              </label>
              <textarea
                id="startup-description"
                rows={5}
                disabled={isSubmitting}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your startup's core mission, product offering, and value proposition..."
                className={`w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border p-3.5 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none ${
                  errors.description ? 'border-[#B23A32] focus:ring-[#B23A32]/30 focus:border-[#B23A32]' : 'border-[#5B6472]/30'
                }`}
              />
              <div className="flex justify-between text-[10px] font-mono text-[#5B6472]">
                <span>{formData.description.length} characters</span>
                <span>Minimum 50 characters required</span>
              </div>
              {errors.description && (
                <p className="text-xs text-[#B23A32] font-mono mt-1">{errors.description}</p>
              )}
            </div>

            {/* Primary Action Button */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0 h-11 shadow-[0_2px_8px_rgba(14,26,43,0.08)] active:bg-[#0F6E5C]/80 flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>Create Startup Profile</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
