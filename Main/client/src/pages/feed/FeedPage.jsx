import React, { useEffect, useState } from 'react';
import { Send, TrendingUp, AlertCircle, RefreshCw, Rss } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { EcosystemPostCard } from './EcosystemPostCard';
import * as postApi from '../../lib/postApi';

export const FeedPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useApp();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Post Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Feed function
  const fetchFeed = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch public posts sorted by creation date (newest first)
      const data = await postApi.listPosts({}, { sort: '-createdAt' });
      setPosts(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load posts from TrustNet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Form submit handler
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setFormError('');

    // Parse comma-separated tags
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length <= 30)
      .slice(0, 20);

    try {
      const payload = {
        title: title.trim() || undefined,
        content: content.trim(),
        postType,
        tags: tags.length > 0 ? tags : undefined,
        visibility,
      };

      await postApi.createPost(payload);
      
      // Clear form on success
      setTitle('');
      setContent('');
      setTagsInput('');
      setPostType('discussion');
      setVisibility('public');
      
      showToast('Post Published', 'Your update is now live on the TrustNet feed!', 'success');
      
      // Reload feed to show the newly created post
      fetchFeed();
    } catch (err) {
      setFormError(err.message || 'Failed to publish post. Please check your fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
 frontend/idetity+trust
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Main Post Creation & Feed Stream */}
      <div className="lg:col-span-8 space-y-6">
        {/* Post Creation Box */}
        <Card className="p-5 border-slate-200 shadow-soft-sm">
          <form onSubmit={handleCreatePost} className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar src={currentUser.avatar} alt={currentUser.name} size="md" isVerified={currentUser?.isVerified || false} />
              <textarea
                rows={3}
                placeholder="Share a startup milestone, pitch deck, or advice with the TrustNet ecosystem..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              />
            </div>

    <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 font-ui text-[#0E1A2B]">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Post Creation & Feed Stream */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Post Creation Box */}
          <Card className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.04)]">
            <h2 className="text-md font-bold mb-4 font-display text-[#0E1A2B]">Share an Update</h2>
            
            <form onSubmit={handleCreatePost} className="space-y-4">
              {formError && (
                <div className="p-3 bg-[#B23A32]/10 border border-[#B23A32]/20 rounded-[4px] flex items-center gap-2 text-[#B23A32] text-xs font-mono">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
 main

              {/* Title input (optional) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="post-title" className="text-xs font-bold text-[#5B6472]">
                  Post Title (Optional)
                </label>
                <input
                  id="post-title"
                  type="text"
                  placeholder="Give your milestone or discussion a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#F7F5EF]/30 border border-[#5B6472]/30 rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E5C] focus:border-[#0F6E5C] placeholder-[#5B6472]/60 font-ui"
                />
              </div>

              {/* Content text (required) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="post-content" className="text-xs font-bold text-[#5B6472]">
                  Your Message <span className="text-[#B23A32]">*</span>
                </label>
                <textarea
                  id="post-content"
                  rows={4}
                  required
                  placeholder="Share a milestone, question, or updates on TrustNet..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#F7F5EF]/30 border border-[#5B6472]/30 rounded-[4px] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F6E5C] focus:border-[#0F6E5C] placeholder-[#5B6472]/60 font-ui resize-none"
                />
              </div>

              {/* Advanced Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Post Type Select */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="post-type" className="text-xs font-bold text-[#5B6472]">
                    Ecosystem Topic
                  </label>
                  <select
                    id="post-type"
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-white border border-[#5B6472]/30 rounded-[4px] px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F6E5C] focus:border-[#0F6E5C] text-[#0E1A2B] font-ui"
                  >
                    <option value="discussion">Discussion</option>
                    <option value="announcement">Announcement</option>
                    <option value="update">Update</option>
                    <option value="pitch">Pitch</option>
                    <option value="question">Question</option>
                  </select>
                </div>

                {/* Visibility Select */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="post-visibility" className="text-xs font-bold text-[#5B6472]">
                    Visibility
                  </label>
                  <select
                    id="post-visibility"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-white border border-[#5B6472]/30 rounded-[4px] px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F6E5C] focus:border-[#0F6E5C] text-[#0E1A2B] font-ui"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                </div>

                {/* Tags Input (comma separated) */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="post-tags" className="text-xs font-bold text-[#5B6472]">
                    Tags (Comma-separated)
                  </label>
                  <input
                    id="post-tags"
                    type="text"
                    placeholder="idea, seed, tech"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-[#F7F5EF]/30 border border-[#5B6472]/30 rounded-[4px] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F6E5C] focus:border-[#0F6E5C] placeholder-[#5B6472]/60 font-mono"
                  />
                </div>

              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2 border-t border-[#5B6472]/15">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !content.trim()} 
                  className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] px-5 py-2 text-xs font-bold flex items-center gap-2 focus:ring-2 focus:ring-[#0F6E5C]/30 focus:outline-none transition-all shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <span>Publishing...</span>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    </>
                  ) : (
                    <>
                      <span>Publish Update</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>

            </form>
          </Card>

          {/* Feed Stream States */}
          {isLoading && (
            <div className="space-y-4" aria-live="polite" aria-busy="true">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.02)] space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-1/4 bg-slate-200 rounded" />
                      <div className="h-3 w-1/3 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-5/6 bg-slate-200 rounded" />
                  </div>
                  <div className="h-3 w-24 bg-slate-100 rounded pt-1" />
                </Card>
              ))}
            </div>
          )}

          {error && (
            <div className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#B23A32]/10 text-[#B23A32] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0E1A2B] font-display">Ecosystem Connection Issue</h3>
                <p className="text-xs text-[#5B6472] mt-1">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchFeed}
                className="mx-auto rounded-[4px] border-[#5B6472]/40 text-[#0E1A2B] hover:bg-[#F7F5EF] flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </Button>
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <EmptyState 
              icon={Rss} 
              title="Welcome to the TrustNet Feed" 
              description="No milestones or updates have been published in the ecosystem yet. Be the first to share one above."
              actionLabel="Write First Post"
              onAction={() => {
                const inputEl = document.getElementById('post-content');
                if (inputEl) {
                  inputEl.focus();
                  inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="bg-white border border-[#5B6472]/20 rounded-[8px]"
            />
          )}

          {!isLoading && !error && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post) => (
                <EcosystemPostCard 
                  key={post._id || post.id} 
                  post={post} 
                  currentUser={currentUser} 
                />
              ))}
            </div>
          )}

        </div>

        {/* Right Sidebar: Trending Topics & suggested actions */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.04)] text-[#0E1A2B]">
            <h3 className="text-sm font-bold text-[#0E1A2B] mb-3 flex items-center gap-2 font-display">
              <TrendingUp className="w-4 h-4 text-[#0F6E5C]" />
              Ecosystem Activity
            </h3>
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-[#F7F5EF]/50 rounded-[4px] border border-[#5B6472]/15">
                <span className="font-bold text-[#0E1A2B] block">Corporate Trust</span>
                <span className="text-[#5B6472] block mt-0.5">Verified updates only</span>
                <div className="text-[10px] text-[#0F6E5C] font-mono mt-1 font-bold">ECOSYSTEM SECURE</div>
              </div>
              <div className="p-3 bg-[#F7F5EF]/50 rounded-[4px] border border-[#5B6472]/15">
                <span className="font-bold text-[#0E1A2B] block">Venture Milestones</span>
                <span className="text-[#5B6472] block mt-0.5">Track startups funding</span>
                <div className="text-[10px] text-[#0F6E5C] font-mono mt-1 font-bold">KYC REQUIRED</div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
