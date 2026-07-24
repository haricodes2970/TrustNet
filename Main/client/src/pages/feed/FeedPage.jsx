import React, { useState } from 'react';
import { Image, Video, FileText, Send, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { PostCard } from '../../components/cards/PostCard';
import { PeopleCard } from '../../components/cards/PeopleCard';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const FeedPage = () => {
  const { currentUser } = useAuth();
  const { posts, createPost, users } = useApp();
  const [postText, setPostText] = useState('');

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!postText.trim()) return;

    createPost({
      id: `post_${Date.now()}`,
      author: currentUser,
      timeAgo: 'Just now',
      content: postText,
      image: null,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      isLiked: false,
      isBookmarked: false,
      comments: []
    });

    setPostText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Main Post Creation & Feed Stream */}
      <div className="lg:col-span-8 space-y-6">
        {/* Post Creation Box */}
        <Card className="p-5 border-slate-200 shadow-soft-sm">
          <form onSubmit={handleCreatePost} className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar src={currentUser.avatar} alt={currentUser.name} size="md" isVerified />
              <textarea
                rows={3}
                placeholder="Share a startup milestone, pitch deck, or advice with the TrustNet ecosystem..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                  <Image className="w-4 h-4 text-emerald-500" />
                  <span>Photo</span>
                </button>
                <button type="button" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                  <Video className="w-4 h-4 text-sky-500" />
                  <span>Video</span>
                </button>
                <button type="button" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Pitch Deck</span>
                </button>
              </div>

              <Button type="submit" size="sm" variant="primary" disabled={!postText.trim()}>
                <span>Post</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </Card>

        {/* Feed Stream */}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      {/* Right Sidebar: Trending Topics & Suggested Network */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="p-5 border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Trending Ecosystem Topics
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
              <span className="font-bold text-slate-900 block">#YCombinatorW24</span>
              <span className="text-slate-400">1,420 posts this week</span>
            </div>
            <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
              <span className="font-bold text-slate-900 block">#AutonomousAgents</span>
              <span className="text-slate-400">890 posts this week</span>
            </div>
            <div className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
              <span className="font-bold text-slate-900 block">#SeedFunding2026</span>
              <span className="text-slate-400">2,100 posts this week</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
