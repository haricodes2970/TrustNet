import React, { useEffect, useState } from 'react';
import { Store, AlertCircle, RefreshCw, Eye, EyeOff, Trash2, RotateCcw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LedgerStamp } from '../../components/common/LedgerStamp';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import * as marketplaceApi from '../../lib/marketplaceApi';
import { apiClient } from '../../lib/apiClient';

export const MyServicesPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useApp();

  const [providerProfile, setProviderProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Fetch all provider profiles to find the one belonging to the logged-in user
      const profiles = await apiClient.get('/provider-profiles');
      const myProfile = profiles.find(
        (p) => String(p.user) === String(currentUser?._id || currentUser?.id)
      );

      if (myProfile) {
        setProviderProfile(myProfile);
        // 2. Fetch listings filtered by this provider's profile ID
        const data = await marketplaceApi.listServiceListings({ provider: myProfile._id });
        setListings(data || []);
      } else {
        setProviderProfile(null);
        setListings([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve your services from TrustNet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePublish = async (id) => {
    setActionLoading(id);
    try {
      await marketplaceApi.publishListing(id);
      showToast('Listing Published', 'Your service listing is now live on the marketplace!', 'success');
      await loadData();
    } catch (err) {
      showToast('Publish Failed', err.message || 'Could not publish listing.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (id) => {
    setActionLoading(id);
    try {
      await marketplaceApi.unpublishListing(id);
      showToast('Listing Reverted to Draft', 'The listing has been unpublished.', 'success');
      await loadData();
    } catch (err) {
      showToast('Unpublish Failed', err.message || 'Could not unpublish listing.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id) => {
    setActionLoading(id);
    try {
      await marketplaceApi.archiveListing(id);
      showToast('Listing Archived', 'The listing has been archived.', 'success');
      await loadData();
    } catch (err) {
      showToast('Archive Failed', err.message || 'Could not archive listing.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (id) => {
    setActionLoading(id);
    try {
      await marketplaceApi.restoreListing(id);
      showToast('Listing Restored', 'The listing is restored as a draft.', 'success');
      await loadData();
    } catch (err) {
      showToast('Restore Failed', err.message || 'Could not restore listing.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 font-ui text-[#0E1A2B]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#0E1A2B]">
            My Service Listings
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-ui">
            Manage your service portfolio, publish listing drafts, or archive outdated services.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] space-y-3 animate-pulse">
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
                <div className="h-3.5 w-full bg-slate-100 rounded" />
                <div className="h-8 w-48 bg-slate-100 rounded" />
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#B23A32]/10 text-[#B23A32] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0E1A2B] font-display">Connection Interrupted</h3>
              <p className="text-xs text-[#5B6472] mt-1">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              className="mx-auto rounded-[4px] border-[#5B6472]/40 text-[#0E1A2B] hover:bg-[#F7F5EF] flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </Button>
          </Card>
        )}

        {/* No Provider Profile Detected */}
        {!isLoading && !error && !providerProfile && (
          <Card className="p-6 bg-white border border-[#C8862B]/20 rounded-[8px] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#C8862B]/10 text-[#C8862B] flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0E1A2B] font-display">No Provider Profile</h3>
              <p className="text-xs text-[#5B6472] mt-2 max-w-md mx-auto leading-relaxed">
                You must register as a service provider on TrustNet before creating and managing listings. Please complete your provider profile.
              </p>
            </div>
          </Card>
        )}

        {/* Success: No Listings */}
        {!isLoading && !error && providerProfile && listings.length === 0 && (
          <EmptyState 
            icon={Store} 
            title="No Services Yet" 
            description="You have not created any service listings. Click below to add your first service draft."
            className="bg-white border border-[#5B6472]/20 rounded-[8px]"
          />
        )}

        {/* Success: Listings Grid */}
        {!isLoading && !error && providerProfile && listings.length > 0 && (
          <div className="space-y-4">
            {listings.map((item) => {
              const isBusy = actionLoading === item._id;
              const priceText = item.priceMin
                ? `${item.currency || 'USD'} ${item.priceMin.toLocaleString()}${item.priceMax ? ` - ${item.priceMax.toLocaleString()}` : '+'}`
                : 'Custom Rate';

              // Determine current lifecycle state for LedgerStamp
              const currentState = item.isArchived ? 'archived' : item.status || 'draft';

              return (
                <Card 
                  key={item._id || item.id} 
                  className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_6px_rgba(14,26,43,0.02)] space-y-4 text-[#0E1A2B]"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[#0E1A2B] font-ui truncate">{item.title}</h3>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 text-[#5B6472] rounded-[4px] font-mono">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#5B6472] line-clamp-2 leading-relaxed">{item.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs font-mono pt-1 text-[#0E1A2B]" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        <span>Rate: {priceText}</span>
                        <span>Billing: {item.pricingModel}</span>
                      </div>
                    </div>

                    {/* Status LedgerStamp */}
                    <div className="flex-shrink-0">
                      <LedgerStamp 
                        label="State" 
                        state={currentState} 
                        timestamp={item.updatedAt || item.createdAt} 
                      />
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#5B6472]/10 flex flex-wrap gap-2.5 justify-end">
                    
                    {/* Archive toggle */}
                    {!item.isArchived ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleArchive(item._id)}
                        disabled={isBusy}
                        className="rounded-[4px] border-[#B23A32]/35 text-[#B23A32] hover:bg-[#B23A32]/5 text-[11px] font-bold flex items-center gap-1 shadow-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleRestore(item._id)}
                        disabled={isBusy}
                        className="rounded-[4px] border-[#0F6E5C]/35 text-[#0F6E5C] hover:bg-[#0F6E5C]/5 text-[11px] font-bold flex items-center gap-1 shadow-none"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </Button>
                    )}

                    {/* Publish/Unpublish toggle (only if not archived) */}
                    {!item.isArchived && (
                      item.status === 'published' ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleUnpublish(item._id)}
                          disabled={isBusy}
                          className="rounded-[4px] border-[#5B6472]/45 text-[#0E1A2B] hover:bg-[#F7F5EF] text-[11px] font-bold flex items-center gap-1 shadow-none"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Unpublish</span>
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          onClick={() => handlePublish(item._id)}
                          disabled={isBusy}
                          className="rounded-[4px] bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-none"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Publish</span>
                        </Button>
                      )
                    )}

                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
