import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import * as marketplaceApi from '../../lib/marketplaceApi';

export const MarketplacePage = () => {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchListings = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Get all published service listings
      const data = await marketplaceApi.listServiceListings();
      setListings(data || []);
    } catch (err) {
      setError(err.message || 'Failed to connect to the TrustNet Marketplace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return (
    <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 font-ui text-[#0E1A2B]">
      <div className="max-w-[1440px] mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#0E1A2B]">
            Professional Services Marketplace
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-ui">
            Discover verified service providers, advisors, and experts to help scale your startup.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
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
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] text-center space-y-4">
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
              onClick={fetchListings}
              className="mx-auto rounded-[4px] border-[#5B6472]/40 text-[#0E1A2B] hover:bg-[#F7F5EF] flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Retry Fetch</span>
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && listings.length === 0 && (
          <EmptyState 
            icon={Store} 
            title="Marketplace Empty" 
            description="There are no professional service listings published on TrustNet at the moment."
            className="bg-white border border-[#5B6472]/20 rounded-[8px]"
          />
        )}

        {/* Success State - Listings Grid */}
        {!isLoading && !error && listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
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
                      className="bg-transparent hover:bg-slate-50 text-[#0F6E5C] border border-transparent text-xs font-bold py-1.5 px-3 rounded-[4px] flex items-center gap-1 shadow-none"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
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
