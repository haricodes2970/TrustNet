import React, { useState } from 'react';
import { useMarketplace } from '../../hooks/useMarketplace';
import { FilterBar } from '../../components/marketplace/FilterBar';
import { MarketplaceCard } from '../../components/marketplace/MarketplaceCard';
import { StartupModal } from '../../components/marketplace/StartupModal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { useApp } from '../../context/AppContext';
import { Search, Compass, Sparkles, Filter } from 'lucide-react';

export const StartupMarketplacePage = () => {
  const { showToast } = useApp();
  const {
    listings,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    savedIds,
    toggleSave,
    contactFounder,
  } = useMarketplace();

  const [activeItem, setActiveItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenContact = (item) => {
    setActiveItem(item);
    setIsModalOpen(true);
  };

  const handleToggleSaveListing = (id) => {
    toggleSave(id);
    const isNowSaved = !savedIds.includes(id);
    showToast(
      isNowSaved ? 'Saved to Bookmarks' : 'Removed from Bookmarks',
      isNowSaved ? 'You can access this listing from Saved Content.' : 'Removed bookmark.',
      'success'
    );
  };

  const handleSendPitch = async (listingId, msgText) => {
    const res = await contactFounder(listingId, msgText);
    if (res.success) {
      showToast('Pitch Delivered', 'The founder was notified of your offer.', 'success');
    }
    return res;
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/80">
              <Compass className="w-7 h-7 text-emerald-500" strokeWidth={1.75} />
            </div>
            <span>Startup Products & Services Marketplace</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1.5">
            Discover and hire verified developers, designers, lawyers, and tools built by ecosystem startups.
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
        <div className="md:col-span-4">
          <Input
            icon={Search}
            placeholder="Search products, services, or startups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="md:col-span-8 overflow-hidden">
          <FilterBar selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-96 bg-slate-100 rounded-2xl animate-pulse border border-slate-200/60" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          title="No Listings Found"
          description="Try broadening your search keywords or switching filters to see other startup services."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((item) => (
            <MarketplaceCard
              key={item.id}
              item={item}
              isSaved={savedIds.includes(item.id)}
              onToggleSave={handleToggleSaveListing}
              onContact={handleOpenContact}
            />
          ))}
        </div>
      )}

      {/* Detail & Contact Modal */}
      <StartupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={activeItem}
        onSendPitch={handleSendPitch}
      />
    </div>
  );
};
