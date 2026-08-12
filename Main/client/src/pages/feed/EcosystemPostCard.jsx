import React from 'react';
import { Card } from '../../components/ui/Card';
import { UserCheck, MessageSquare, ThumbsUp } from 'lucide-react';

export const EcosystemPostCard = ({ post, currentUser }) => {
  const authorId = post.author?._id || post.author || '';
  const authorName = (post.author && typeof post.author === 'object') 
    ? (post.author.fullName || post.author.name || 'Ecosystem Member') 
    : (currentUser && authorId && String(authorId) === String(currentUser._id || currentUser.id)
      ? currentUser.fullName
      : (authorId ? `User ...${String(authorId).slice(-6)}` : 'Unknown Author'));

  const authorDesignation = (post.author && typeof post.author === 'object')
    ? (post.author.designation || 'Ecosystem Member')
    : (currentUser && authorId && String(authorId) === String(currentUser._id || currentUser.id)
      ? currentUser.designation || 'Founder'
      : 'Ecosystem Member');

  const isVerified = (post.author && typeof post.author === 'object')
    ? post.author.isVerified
    : (currentUser && authorId && String(authorId) === String(currentUser._id || currentUser.id)
      ? currentUser.isVerified
      : false);

  const formattedDate = post.createdAt 
    ? new Date(post.createdAt).toISOString().replace('T', ' ').slice(0, 10)
    : 'Just now';

  // Spacing: 8/16/24/32/48/64px
  // Radius: 8px for cards, 4px for inputs/badges
  return (
    <Card 
      className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.04)] mb-4 text-[#0E1A2B] font-ui"
    >
      {/* Post Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0F6E5C]/10 flex items-center justify-center text-[#0F6E5C] font-bold">
            {authorName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-[#0E1A2B] font-ui">{authorName}</h4>
              {isVerified && (
                <span className="text-[#0F6E5C]" title="Verified member">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-[#5B6472] font-ui">{authorDesignation}</p>
            <div className="text-[10px] text-[#5B6472] font-mono mt-0.5">
              ID: {authorId || 'N/A'} • {formattedDate}
            </div>
          </div>
        </div>

        {post.postType && (
          <span 
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-[4px] font-mono"
          >
            {post.postType}
          </span>
        )}
      </div>

      {/* Post Content */}
      <div className="space-y-2 mb-4">
        {post.title && (
          <h3 
            className="text-lg font-bold text-[#0E1A2B] leading-tight font-display" 
          >
            {post.title}
          </h3>
        )}
        <p className="text-sm text-[#0E1A2B] leading-relaxed whitespace-pre-line font-ui">
          {post.content}
        </p>
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag, idx) => (
            <span 
              key={idx} 
              className="text-[10px] px-2 py-0.5 bg-slate-100 text-[#5B6472] rounded-[4px] font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom Stats Bar */}
      <div className="flex items-center gap-6 pt-3 border-t border-[#5B6472]/10 text-xs text-[#5B6472]">
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="w-4 h-4" />
          <span className="font-mono">
            {post.likeCount || 0} Likes
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4" />
          <span className="font-mono">
            {post.commentCount || 0} Comments
          </span>
        </div>
      </div>
    </Card>
  );
};
