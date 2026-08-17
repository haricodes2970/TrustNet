import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Bookmark, Share2, Send, MoreHorizontal, Edit3, Trash2, X, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import * as commentApi from '../../lib/commentApi';

export const PostCard = ({ post }) => {
  const { toggleLikePost, addCommentToPost, toggleBookmark, showToast } = useApp();
  const { currentUser } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  // Real comments state
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Inline editing state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editInput, setEditInput] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const isRealPost = /^[0-9a-fA-F]{24}$/.test(post.id || post._id);

  const fetchRealComments = async () => {
    if (!isRealPost) {
      // Fallback: use mock comments
      setComments(post.comments || []);
      return;
    }
    setIsLoadingComments(true);
    setCommentError('');
    try {
      const list = await commentApi.listComments(post.id || post._id);
      setComments(list || []);
    } catch (err) {
      setCommentError('Could not load real comments.');
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchRealComments();
    }
  }, [showComments, post.id, post._id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    if (!isRealPost) {
      // Mock flow
      addCommentToPost(post.id, commentInput, currentUser);
      setComments(prev => [
        ...prev,
        {
          id: `comment_${Date.now()}`,
          author: {
            name: currentUser.name || currentUser.fullName || 'You',
            avatar: currentUser.avatar || currentUser.avatarUrl
          },
          text: commentInput,
          timeAgo: 'Just now'
        }
      ]);
      setCommentInput('');
      return;
    }

    setIsSubmittingComment(true);
    try {
      await commentApi.addComment(post.id || post._id, commentInput.trim());
      setCommentInput('');
      showToast('Comment Posted', 'Comment added successfully.', 'success');
      await fetchRealComments();
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to submit comment.', 'rose');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId, oldText) => {
    setEditingCommentId(commentId);
    setEditInput(oldText);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editInput.trim()) return;

    if (!isRealPost) {
      // Mock flow
      setComments(prev =>
        prev.map(c => (c.id === commentId ? { ...c, text: editInput.trim() } : c))
      );
      setEditingCommentId(null);
      return;
    }

    setIsSavingEdit(true);
    try {
      await commentApi.updateComment(commentId, editInput.trim());
      setEditingCommentId(null);
      showToast('Comment Updated', 'Saved comment edits.', 'success');
      await fetchRealComments();
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to save comment edits.', 'rose');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    if (!isRealPost) {
      // Mock flow
      setComments(prev => prev.filter(c => c.id !== commentId));
      showToast('Comment Deleted', 'Mock comment removed.', 'success');
      return;
    }

    try {
      await commentApi.deleteComment(commentId);
      showToast('Comment Deleted', 'Soft-deleted comment.', 'success');
      await fetchRealComments();
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to delete comment.', 'rose');
    }
  };

  const currentUserId = currentUser?.id || currentUser?._id;

  return (
    <Card className="p-5 border-slate-200 shadow-soft-sm mb-4">
      {/* Author Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={post.author.avatar || post.author.avatarUrl}
            alt={post.author.name}
            size="md"
            isVerified={post.author.isVerified}
          />
          <div>
            <h4 className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer font-sans">
              {post.author.name}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-1 font-sans">{post.author.headline}</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">{post.timeAgo}</span>
          </div>
        </div>
        <button className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line mb-3 font-sans">
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
      <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-slate-100 mb-2 font-mono">
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
            className="border-t border-slate-100 pt-3 mt-3 space-y-3 bg-[#F7F5EF]/30 p-3 rounded-[8px]"
          >
            {/* Input Form */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <Avatar src={currentUser.avatar || currentUser.avatarUrl} alt={currentUser.name} size="sm" />
              <input
                type="text"
                placeholder="Add a constructive comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                disabled={isSubmittingComment}
                className="flex-1 bg-white border border-slate-200 text-xs rounded-[4px] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 outline-none"
              />
              <Button type="submit" size="sm" variant="primary" disabled={isSubmittingComment} className="bg-[#0F6E5C] text-white hover:bg-[#0F6E5C]/90 rounded-[4px] border-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>

            {/* List of comments */}
            {isLoadingComments ? (
              <p className="text-[10px] font-mono text-[#5B6472] animate-pulse">Loading comments...</p>
            ) : commentError ? (
              <p className="text-[10px] font-mono text-[#B23A32] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {commentError}
              </p>
            ) : comments.length === 0 ? (
              <p className="text-[10px] font-mono text-[#5B6472]">No comments posted yet.</p>
            ) : (
              <div className="space-y-2.5 pt-2">
                {comments.map((comment) => {
                  const authorObj = comment.author || {};
                  const commentAuthorId = authorObj._id || authorObj.id;
                  const isCommentOwner = String(commentAuthorId) === String(currentUserId) || currentUser?.role === 'admin';
                  const commentId = comment._id || comment.id;

                  return (
                    <div key={commentId} className="flex items-start gap-2.5 bg-white p-3 rounded-[8px] border border-slate-200/60 text-xs">
                      <Avatar src={authorObj.avatar || authorObj.avatarUrl} alt={authorObj.fullName || authorObj.name} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 font-sans">{authorObj.fullName || authorObj.name || 'Anonymous'}</span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : comment.timeAgo || 'Just now'}
                          </span>
                        </div>

                        {editingCommentId === commentId ? (
                          <div className="mt-1.5 flex gap-2">
                            <input
                              type="text"
                              value={editInput}
                              onChange={(e) => setEditInput(e.target.value)}
                              disabled={isSavingEdit}
                              className="flex-1 bg-[#F7F5EF] border border-[#5B6472]/30 text-xs rounded-[4px] px-2 py-1 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveEdit(commentId)}
                              disabled={isSavingEdit}
                              className="text-[10px] font-semibold text-[#0F6E5C] hover:underline"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCommentId(null)}
                              disabled={isSavingEdit}
                              className="text-[10px] font-semibold text-[#B23A32] hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-slate-700 mt-0.5 font-sans whitespace-pre-line">{comment.content || comment.text}</p>
                        )}
                      </div>

                      {isCommentOwner && editingCommentId !== commentId && (
                        <div className="flex items-center gap-1 self-start">
                          <button
                            onClick={() => handleEditComment(commentId, comment.content || comment.text)}
                            className="text-[#5B6472] hover:text-[#0E1A2B] p-1 rounded transition-colors"
                            title="Edit Comment"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(commentId)}
                            className="text-[#B23A32]/70 hover:text-[#B23A32] p-1 rounded transition-colors"
                            title="Delete Comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
