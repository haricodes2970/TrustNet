import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, AlertCircle, RefreshCw, ChevronRight, Lock, Inbox } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import * as marketplaceApi from '../../lib/marketplaceApi';

export const MarketplacePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // States: 'loading' | 'success' | 'empty' | 'error' | 'unauthorized'
  const [viewState, setViewState] = useState('loading');

  const fetchListings = async (searchVal = searchQuery) => {
    setIsLoading(true);
    setError('');
    try {
      // Get all published service listings
      const data = await marketplaceApi.listServiceListings({ search: searchVal });
      setListings(data || []);
    } catch (err) {
      setError(err.message || 'Failed to connect to the TrustNet Marketplace.');
      setViewState('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and sync with authentication state
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setViewState('unauthorized');
        setIsLoading(false);
      } else {
        setViewState('success');
        fetchListings(activeSearch);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authLoading, retryCount, activeSearch]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  // Determine if we should show the QA switcher (dev-only: localhost or query parameter ?qa=true)
  const showQASwitcher = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.search.includes('qa=true');

  const renderContent = () => {
    // 1. Loading State
    if (isLoading || viewState === 'loading') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading listings">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] space-y-3.5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
                <div className="h-4 w-12 bg-slate-100 rounded-[4px]" />
              </div>
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-full bg-slate-200 rounded" />
                <div className="h-3.5 w-5/6 bg-slate-200 rounded" />
              </div>
              <div className="h-3.5 w-24 bg-slate-100 rounded font-mono pt-1" />
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
              Please log in to view professional services listings in the TrustNet Marketplace.
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
        <Card className="p-8 border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Connection Interrupted</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {error || 'Failed to retrieve marketplace data. The backend server might be offline.'}
            </p>
          </div>
          <div className="max-w-xs mx-auto">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/50 focus:ring-2 focus:ring-red-500 focus:outline-none"
              onClick={handleRetry}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Fetch</span>
            </Button>
          </div>
        </Card>
      );
    }

    // 4. Empty State
    const displayListings = viewState === 'empty' ? [] : listings;
    if (displayListings.length === 0) {
      return (
        <Card className="p-12 border-slate-200 dark:border-slate-800 text-center space-y-4 bg-white">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Marketplace Empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              There are no professional service listings matching your criteria published on TrustNet at the moment.
            </p>
          </div>
        </Card>
      );
    }

    // 5. Success State
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayListings.map((listing) => {
          const priceText = listing.priceMin 
            ? `${listing.currency || 'USD'} ${listing.priceMin.toLocaleString()}${listing.priceMax ? ` - ${listing.priceMax.toLocaleString()}` : '+'}` 
            : 'Custom Rate';

          return (
            <Card 
              key={listing._id || listing.id} 
              className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.03)] flex flex-col justify-between text-[#0E1A2B] hover:border-[#0F6E5C]/40 transition-colors"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#0E1A2B] font-ui line-clamp-2 leading-tight">
                    {listing.title}
                  </h3>
                  {listing.pricingModel && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-[4px] font-mono flex-shrink-0">
                      {listing.pricingModel}
                    </span>
                  )}
                </div>

                {/* Category Label */}
                <p className="text-xs text-[#5B6472] font-ui">{listing.category}</p>
                
                {/* Description */}
                <p className="text-xs text-[#5B6472] line-clamp-3 leading-relaxed font-ui">
                  {listing.description}
                </p>

                {/* Price Range */}
                <div 
                  className="text-xs font-mono text-[#0E1A2B] bg-[#F7F5EF] p-2 rounded-[4px] inline-block"
                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                >
                  Rate: {priceText}
                </div>

                {/* Tags */}
                {listing.tags && listing.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {listing.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-[#5B6472] rounded-[4px] font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Action footer */}
              <div className="pt-4 mt-4 border-t border-[#5B6472]/10 flex justify-end">
                <Button
                  onClick={() => navigate(`/app/service-listings/${listing._id || listing.id}`)}
                  className="bg-transparent hover:bg-slate-50 text-[#0F6E5C] border border-transparent text-xs font-bold py-1.5 px-3 rounded-[4px] flex items-center gap-1 shadow-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:outline-none"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 font-ui text-[#0E1A2B]">
      <div className="max-w-[1440px] mx-auto space-y-6">
        
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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#0E1A2B]">
              Professional Services Marketplace
            </h1>
            <p className="text-xs text-[#5B6472] mt-1 font-ui">
              Discover verified service providers, advisors, and experts to help scale your startup.
            </p>
          </div>

          {/* Search Toolbar */}
          {viewState !== 'unauthorized' && viewState !== 'error' && (
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:max-w-xs bg-white p-1 border border-[#5B6472]/20 rounded-xl shadow-soft-sm">
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none px-3 py-1.5 text-slate-800 placeholder-slate-400"
                aria-label="Search services"
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                className="rounded-lg bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white text-xs font-bold min-h-[36px]"
              >
                Search
              </Button>
            </form>
          )}
        </div>

        {renderContent()}

      </div>
    </div>
  );
};
