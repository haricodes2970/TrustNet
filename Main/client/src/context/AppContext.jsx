import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import * as startupApi from '../lib/startupApi';
import { normalizeStartups } from '../lib/adapters/startupAdapter';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Startups is fetched from the real backend once the user is
  // authenticated; the remaining collections begin empty until their
  // respective backend integrations are available.
  const { isAuthenticated } = useAuth();
  const [startups, setStartups] = useState([]);
  const [startupsLoading, setStartupsLoading] = useState(false);
  const [startupsError, setStartupsError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setStartupsLoading(true);
      setStartupsError('');
      try {
        const data = await startupApi.listStartups();
        if (!cancelled) setStartups(normalizeStartups(data));
      } catch (err) {
        if (!cancelled) setStartupsError(err.message);
      } finally {
        if (!cancelled) setStartupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
  // No fake production data. These start empty (proper empty state) until a
  // real API for each vertical is wired by its owner. Shapes are unchanged
  // (arrays), so consumers render empty states instead of breaking.
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  
  // UI States
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // { type, data }
  const [toasts, setToasts] = useState([]);

  // Toast Trigger Helper
  const showToast = (title, message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Toggle Bookmark logic across startups, posts, opportunities, events
  const toggleBookmark = (itemType, itemId) => {
    if (itemType === 'startup') {
      setStartups(prev => prev.map(s => s.id === itemId ? { ...s, isBookmarked: !s.isBookmarked } : s));
    } else if (itemType === 'post') {
      setPosts(prev => prev.map(p => p.id === itemId ? { ...p, isBookmarked: !p.isBookmarked } : p));
    } else if (itemType === 'opportunity') {
      setOpportunities(prev => prev.map(o => o.id === itemId ? { ...o, isBookmarked: !o.isBookmarked } : o));
    } else if (itemType === 'event') {
      setEvents(prev => prev.map(e => e.id === itemId ? { ...e, isRegistered: !e.isRegistered } : e));
    }
    showToast('Saved to Bookmarks', 'Item updated in your saved collection.', 'success');
  };

  // Like Post
  const toggleLikePost = (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1
        };
      }
      return p;
    }));
  };

  // Add Comment
  const addCommentToPost = (postId, commentText, author) => {
    const newComment = {
      id: `c_${Date.now()}`,
      author,
      text: commentText,
      timeAgo: 'Just now'
    };
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    }));
    showToast('Comment Added', 'Your comment has been posted.', 'success');
  };

  // Add New Post
  const createPost = (postObj) => {
    setPosts(prev => [postObj, ...prev]);
    showToast('Post Published', 'Your update is now live on the social feed!', 'success');
  };

  // Send Chat Message
  const sendMessage = (conversationId, text) => {
    const newMsg = {
      id: `m_${Date.now()}`,
      senderId: 'usr_me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: text,
          lastTime: newMsg.time,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    }));
  };

  // Toggle Connection Status
  const updateConnectionStatus = (userId, newStatus) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, connectionStatus: newStatus } : u));
    showToast('Connection Request Updated', `Status changed to ${newStatus}.`, 'info');
  };

  return (
    <AppContext.Provider value={{
      startups, setStartups, startupsLoading, startupsError,
      posts, setPosts,
      communities, setCommunities,
      opportunities, setOpportunities,
      events, setEvents,
      conversations, setConversations,
      notifications, setNotifications,
      users, setUsers,
      files, setFiles,
      isCommandPaletteOpen, setIsCommandPaletteOpen,
      activeModal, setActiveModal,
      toasts, showToast, removeToast,
      toggleBookmark,
      toggleLikePost,
      addCommentToPost,
      createPost,
      sendMessage,
      updateConnectionStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
