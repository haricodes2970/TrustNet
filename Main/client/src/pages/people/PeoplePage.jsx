import React, { useState, useEffect } from 'react';
import { Search, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { PeopleCard } from '../../components/cards/PeopleCard';
import { EmptyState } from '../../components/common/EmptyState';
import { search as apiSearch } from '../../lib/searchApi';
import { Card } from '../../components/ui/Card';

export const PeoplePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [backendUsers, setBackendUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const roles = ['All', 'Founder', 'Investor', 'Mentor'];

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMsg('');

    const delayDebounce = setTimeout(async () => {
      try {
        // Fetch users matching query, default to a space to fetch all active users on mount
        const queryTerm = searchQuery.trim() || ' ';
        const response = await apiSearch(queryTerm, 'users');
        if (active) {
          setBackendUsers(response.users || []);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Failed to search members.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [searchQuery, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const mapRole = (role) => {
    if (!role) return 'Founder';
    const r = role.toLowerCase();
    if (r === 'entrepreneur') return 'Founder';
    if (r === 'investor') return 'Investor';
    if (r === 'mentor') return 'Mentor';
    if (r === 'admin') return 'Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const adaptedUsers = backendUsers.map(u => ({
    id: u._id || u.id,
    name: u.fullName || u.username,
    avatar: u.avatarUrl,
    headline: u.designation || 'TrustNet Member',
    role: mapRole(u.role),
    isVerified: u.isVerified,
    skills: u.skills || [],
    organization: u.organization || '',
    connectionStatus: u.connectionStatus || 'none'
  }));

  const filteredUsers = adaptedUsers.filter(u => {
    return selectedRole === 'All' || u.role === selectedRole;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight dark:text-white">Explore People & Founders</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Discover verified entrepreneurs, VCs, and mentors</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft-sm">
        <div className="flex-1 w-full">
          <Input
            icon={Search}
            placeholder="Search by name, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                selectedRole === r
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading members">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 border-slate-200 dark:border-slate-800 flex flex-col justify-between h-48 animate-pulse">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : errorMsg ? (
        <Card className="p-6 border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/50 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Search API Error</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{errorMsg}</p>
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Search</span>
          </button>
        </Card>
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <PeopleCard key={u.id} user={u} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No Members Found"
          description={searchQuery ? `No members matched your search query "${searchQuery}".` : "No members found in this role category."}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedRole('All');
          }}
        />
      )}
    </div>
  );
};
