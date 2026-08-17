import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, User, Rocket, Users, Rss, Store, AlertCircle, RefreshCw, Lock, Inbox } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import * as searchApi from '../../lib/searchApi';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';

  const [searchInput, setSearchInput] = useState(queryParam);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // States: 'loading' | 'success' | 'empty' | 'error' | 'unauthorized'
  const [viewState, setViewState] = useState('loading');

  // Map user tabs to backend types
  const tabs = [
    { id: 'all', label: 'All Results', icon: Search },
    { id: 'users', label: 'Users', icon: User },
    { id: 'startups', label: 'Startups', icon: Rocket },
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'posts', label: 'Feed Posts', icon: Rss },
    { id: 'listings', label: 'Marketplace', icon: Store },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    // Update query params, preserving type
    setSearchParams({ q: searchInput.trim(), type: typeParam });
  };

  const handleTabChange = (tabId) => {
    if (queryParam) {
      setSearchParams({ q: queryParam, type: tabId });
    } else {
      setSearchParams({ type: tabId });
    }
  };

  const executeSearch = async () => {
    if (!queryParam.trim()) {
      setResults({ users: [], startups: [], communities: [], posts: [], listings: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    
    // Backend expects undefined for all search
    const typeValue = typeParam === 'all' ? undefined : typeParam;

    try {
      const data = await searchApi.search(queryParam.trim(), typeValue);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
      setViewState('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync initial view state with auth status and load simulator
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setViewState('unauthorized');
        setIsLoading(false);
      } else {
        setViewState('success');
        executeSearch();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authLoading, retryCount, queryParam, typeParam]);

  // Sync search input with URL param changes (e.g. from top nav redirection)
  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const hasAnyResults = results && (
    (results.users?.length || 0) +
    (results.startups?.length || 0) +
    (results.communities?.length || 0) +
    (results.posts?.length || 0) +
    (results.listings?.length || 0)
  ) > 0;

  // Determine if we should show the QA switcher (dev-only: localhost or query parameter ?qa=true)
  const showQASwitcher = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.search.includes('qa=true');

  const renderContent = () => {
    // 1. Loading State
    if (isLoading || viewState === 'loading') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse" aria-busy="true" aria-label="Loading search results">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] h-32 space-y-3">
              <div className="h-4 w-1/3 bg-slate-200 rounded" />
              <div className="h-3 w-5/6 bg-slate-100 rounded" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
            </Card>
          ))}
        </div>
      );
    }

    // 2. Unauthorized State
    if (viewState === 'unauthorized') {
      return (
        <Card className="p-8 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Authentication Required</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Please log in to search the TrustNet ecosystem directory.
            </p>
          </div>
          <div className="max-w-xs mx-auto">
            <Button 
              variant="primary" 
              className="w-full focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              onClick={() => navigate('/login')}
            >
              <span>Go to Login</span>
            </Button>
          </div>
        </Card>
      );
    }

    // 3. Error State
    if (viewState === 'error' || error) {
      return (
        <Card className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#B23A32]/10 text-[#B23A32] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0E1A2B] font-display">Search Interrupted</h3>
            <p className="text-xs text-[#5B6472] mt-1">{error || 'Failed to complete search query. The server could not be reached.'}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="mx-auto rounded-[4px] border-[#5B6472]/40 text-[#0E1A2B] hover:bg-[#F7F5EF] flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Retry Search</span>
          </Button>
        </Card>
      );
    }

    // 4. Initial/No Query State
    if (!queryParam) {
      return (
        <Card className="p-12 border-slate-200 dark:border-slate-800 text-center space-y-4 bg-white">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Start Searching</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Type key terms into the search bar above to query TrustNet.
            </p>
          </div>
        </Card>
      );
    }

    // 5. Empty (No Results Found) State
    const hasResults = viewState === 'empty' ? false : hasAnyResults;
    if (!hasResults) {
      return (
        <Card className="p-12 border-slate-200 dark:border-slate-800 text-center space-y-4 bg-white">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Results Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              We couldn't find any results matching "{queryParam}" in this category.
            </p>
          </div>
        </Card>
      );
    }

    // 6. Success State (Renders real results)
    return (
      <div className="space-y-8 animate-fade-in">
        
        {/* Category: Users */}
        {(typeParam === 'all' || typeParam === 'users') && results.users?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-[#5B6472] font-mono">
              Ecosystem Users ({results.users.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.users.map((item) => (
                <Card
                  key={item._id || item.id}
                  onClick={() => navigate(`/app/people/${item._id || item.id}`)}
                  className="p-4 bg-white border border-[#5B6472]/20 rounded-[8px] hover:border-[#0F6E5C]/50 cursor-pointer transition-all flex gap-3 items-center text-[#0E1A2B]"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0F6E5C]/10 flex items-center justify-center text-[#0F6E5C] font-bold text-sm flex-shrink-0">
                    {item.fullName?.slice(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-[#0E1A2B] truncate">{item.fullName}</h4>
                      {item.isVerified && (
                        <span className="text-[#0F6E5C] font-mono text-[9px] font-bold px-1 bg-[#0F6E5C]/10 rounded">KYC</span>
                      )}
                    </div>
                    <p className="text-xs text-[#5B6472] truncate">{item.designation || 'Ecosystem Member'}</p>
                    <p className="text-[10px] text-[#5B6472] font-mono mt-0.5 truncate">@{item.username}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Category: Startups */}
        {(typeParam === 'all' || typeParam === 'startups') && results.startups?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-[#5B6472] font-mono">
              Startups ({results.startups.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.startups.map((item) => (
                <Card
                  key={item._id || item.id}
                  onClick={() => navigate(`/app/startups/${item._id || item.id}`)}
                  className="p-4 bg-white border border-[#5B6472]/20 rounded-[8px] hover:border-[#0F6E5C]/50 cursor-pointer transition-all flex gap-3 items-start text-[#0E1A2B]"
                >
                  <div className="w-10 h-10 rounded-[4px] bg-slate-100 flex items-center justify-center text-[#5B6472] font-mono text-xs flex-shrink-0 border border-[#5B6472]/15">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-[4px]" />
                    ) : (
                      item.name?.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#0E1A2B] truncate">{item.name}</h4>
                      {item.stage && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#C8862B]/10 text-[#C8862B] rounded-[4px] font-mono flex-shrink-0">
                          {item.stage}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#0E1A2B] font-ui line-clamp-1 mt-0.5">{item.tagline}</p>
                    <span className="inline-block text-[10px] text-[#5B6472] font-mono mt-1">
                      Sector: {item.category || 'Unclassified'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Category: Communities */}
        {(typeParam === 'all' || typeParam === 'communities') && results.communities?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-[#5B6472] font-mono">
              Communities ({results.communities.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.communities.map((item) => (
                <Card
                  key={item._id || item.id}
                  onClick={() => navigate('/app/communities')}
                  className="p-4 bg-white border border-[#5B6472]/20 rounded-[8px] hover:border-[#0F6E5C]/50 cursor-pointer transition-all flex gap-3 items-start text-[#0E1A2B]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#0E1A2B] truncate">{item.name}</h4>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 text-[#5B6472] rounded-[4px] font-mono flex-shrink-0">
                        {item.type || 'Public'}
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6472] line-clamp-2 leading-relaxed">{item.description}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-[#5B6472] font-mono">
                      <span>Sector: {item.category}</span>
                      <span>{item.memberCount || 0} Members</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Category: Feed Posts */}
        {(typeParam === 'all' || typeParam === 'posts') && results.posts?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-[#5B6472] font-mono">
              Feed Updates ({results.posts.length})
            </h3>
            <div className="space-y-4">
              {results.posts.map((item) => (
                <Card
                  key={item._id || item.id}
                  onClick={() => navigate('/app/feed')}
                  className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] hover:border-[#0F6E5C]/50 cursor-pointer transition-all text-[#0E1A2B] space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[10px] font-mono text-[#5B6472]">
                      Author ID: {item.author} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                    </div>
                    {item.postType && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-[4px] font-mono">
                        {item.postType}
                      </span>
                    )}
                  </div>
                  {item.title && (
                    <h4 className="text-sm font-bold text-[#0E1A2B] font-display">{item.title}</h4>
                  )}
                  <p className="text-xs text-[#0E1A2B] leading-relaxed line-clamp-3">{item.content}</p>
                  <div className="flex items-center gap-4 pt-1.5 text-[10px] text-[#5B6472] font-mono">
                    <span>{item.likeCount || 0} Likes</span>
                    <span>{item.commentCount || 0} Comments</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Category: Marketplace Listings */}
        {(typeParam === 'all' || typeParam === 'listings') && results.listings?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-[#5B6472] font-mono">
              Service Listings ({results.listings.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.listings.map((item) => (
                <Card
                  key={item._id || item.id}
                  onClick={() => navigate(`/app/service-listings/${item._id || item.id}`)}
                  className="p-4 bg-white border border-[#5B6472]/20 rounded-[8px] hover:border-[#0F6E5C]/50 cursor-pointer transition-all text-[#0E1A2B] space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#0E1A2B] line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-[#5B6472] mt-0.5">{item.category}</p>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-[4px] font-mono flex-shrink-0">
                      {item.pricingModel}
                    </span>
                  </div>

                  {/* Price Details */}
                  <div className="text-xs font-mono text-[#0E1A2B]">
                    Rate: {item.currency} {item.priceMin?.toLocaleString()} 
                    {item.priceMax ? ` - ${item.priceMax.toLocaleString()}` : '+'}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-[#5B6472] rounded-[4px] font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-[9px] text-[#5B6472] font-mono pt-1">
                    Provider ID: {item.provider}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 font-ui text-[#0E1A2B]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Dev/QA State Switcher Controls - Only rendered on localhost/localhost IP */}
        {showQASwitcher && (
          <div className="bg-white border border-[#5B6472]/20 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-soft-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[#5B6472] uppercase tracking-wider text-[10px]">
                QA Simulation Controls (Local Dev Only):
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['loading', 'success', 'empty', 'error', 'unauthorized'].map((state) => (
                <button
                  key={state}
                  onClick={() => setViewState(state)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    viewState === state
                      ? 'bg-emerald-500 text-white shadow-soft-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {state.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#0E1A2B]">
            Global Search
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-ui">
            Discover founders, startups, service listings, posts, and communities across TrustNet.
          </p>
        </div>

        {/* Search Form Bar */}
        {viewState !== 'unauthorized' && viewState !== 'error' && (
          <Card className="p-4 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.03)]">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="Search Keywords"
                  id="search-input-field"
                  type="text"
                  placeholder="Type keywords (e.g. legal, seed, Jane)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  icon={Search}
                  className="bg-[#F7F5EF]/30 border-[#5B6472]/30 rounded-[4px] font-ui focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] h-10"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !searchInput.trim()}
                className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] px-6 h-10 text-xs font-bold w-full sm:w-auto shadow-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:outline-none min-h-[40px]"
              >
                Search
              </Button>
            </form>
          </Card>
        )}

        {/* Category Tabs */}
        {viewState !== 'unauthorized' && viewState !== 'error' && (
          <div className="flex flex-wrap gap-2 border-b border-[#5B6472]/15 pb-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = typeParam === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 rounded-t-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#0F6E5C]/20 ${
                    isActive
                      ? 'border-[#0F6E5C] text-[#0F6E5C]'
                      : 'border-transparent text-[#5B6472] hover:text-[#0E1A2B] hover:border-[#5B6472]/20'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results Area */}
        <div className="space-y-6">
          {renderContent()}
        </div>

      </div>
    </div>
  );
};
