import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Bookmark, Share2, Send, MoreHorizontal } from 'lucide-react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const PostCard = ({ post }) => {
  const { toggleLikePost, addCommentToPost, toggleBookmark, showToast } = useApp();
  const { currentUser } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    addCommentToPost(post.id, commentInput, currentUser);
    setCommentInput('');
  };

  return (
    <Card className="p-5 border-slate-200 shadow-soft-sm mb-4">
      {/* Author Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={post.author.avatar}
            alt={post.author.name}
            size="md"
            isVerified={post.author.isVerified}
          />
          <div>
            <h4 className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer">
              {post.author.name}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-1">{post.author.headline}</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{post.timeAgo}</span>
          </div>
        </div>
        <button className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line mb-3">
        {post.content}
      </p>

      {/* Attached Image if present */}
      {post.image && (
        <div className="rounded-xl overflow-hidden mb-4 border border-slate-100 max-h-96">
          <img
            src={post.image}
            alt="Post content"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Counters Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-slate-100 mb-2">
        <span className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          {post.likesCount} Likes
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowComments(!showComments)} className="hover:underline">
            {post.commentsCount} Comments
          </button>
          <span>•</span>
          <span>{post.repostsCount} Reposts</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-600">
        <button
          onClick={() => toggleLikePost(post.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors ${
            post.isLiked ? 'text-rose-500' : 'hover:text-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500' : ''}`} />
          <span>Like</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 hover:text-emerald-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </button>

        <button
          onClick={() => showToast('Post Reposted', 'Shared to your timeline feed.', 'info')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 hover:text-emerald-600 transition-colors"
        >
          <Repeat2 className="w-4 h-4" />
          <span>Repost</span>
        </button>

        <button
          onClick={() => toggleBookmark('post', post.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors ${
            post.isBookmarked ? 'text-emerald-600' : 'hover:text-emerald-600'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-emerald-500 text-emerald-500' : ''}`} />
          <span>Save</span>
        </button>
      </div>

      {/* Comments Section Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-100 pt-3 mt-3 space-y-3"
          >
            {/* Input Form */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <Avatar src={currentUser.avatar} alt={currentUser.name} size="sm" />
              <input
                type="text"
                placeholder="Add a constructive comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <Button type="submit" size="sm" variant="primary">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>

            {/* List of comments */}
            <div className="space-y-2.5 pt-2">
              {post.comments?.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl text-xs">
                  <Avatar src={comment.author.avatar} alt={comment.author.name} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{comment.author.name}</span>
                      <span className="text-[10px] text-slate-400">{comment.timeAgo}</span>
                    </div>
                    <p className="text-slate-700 mt-0.5">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
