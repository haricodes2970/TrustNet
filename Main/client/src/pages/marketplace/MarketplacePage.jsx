import React, { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { listServiceListings } from '../../lib/marketplaceApi';

// Minimal stub -- the backend Marketplace module (ProviderProfile /
// ServiceListing / EngagementRequest) has no corresponding page in the
// original frontend design at all. This lists published service listings
// only (the public read surface); pledging/engagement-request flows are
// not built here, see the integration report.
export const MarketplacePage = () => {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listServiceListings();
        if (!cancelled) setListings(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Marketplace</h1>
        <p className="text-xs text-slate-500 mt-1">Service providers available to startups on TrustNet</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading listings…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isLoading && !error && listings.length === 0 && (
        <EmptyState icon={Store} title="No Listings Yet" description="No published service listings are available right now." />
      )}

      {!isLoading && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing._id} className="p-5 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">{listing.title}</h3>
                <Badge variant="emerald">{listing.pricingModel || 'Custom'}</Badge>
              </div>
              <p className="text-xs text-slate-500 mb-3">{listing.category}</p>
              <p className="text-xs text-slate-600 line-clamp-3">{listing.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
