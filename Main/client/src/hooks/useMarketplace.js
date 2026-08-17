import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../lib/apiClient';

const CATEGORIES = ['All', 'Legal', 'Design', 'Development', 'Marketing', 'Tools'];

export const useMarketplace = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('trustnet_saved_listings') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setLoading(true);
    apiClient
      .get('/marketplace/listings')
      .then((data) => {
        setListings(Array.isArray(data) ? data : (data?.listings || []));
      })
      .catch((err) => {
        // A missing/404 marketplace endpoint must not crash the whole app.
        setListings([]);
        setError(err.message || 'Unable to load marketplace listings.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [listings, selectedCategory, searchQuery]);

  const toggleSave = (id) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('trustnet_saved_listings', JSON.stringify(next));
      return next;
    });
  };

  const contactFounder = async (listingId, message) => {
    try {
      await apiClient.post('/marketplace/contact', { listingId, message });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  return {
    listings: filteredListings,
    loading,
    error,
    categories: CATEGORIES,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    savedIds,
    toggleSave,
    contactFounder
  };
};
