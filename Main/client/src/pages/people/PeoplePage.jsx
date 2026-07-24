import React, { useState } from 'react';
import { Search, Filter, Users } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { PeopleCard } from '../../components/cards/PeopleCard';
import { EmptyState } from '../../components/common/EmptyState';
import { MOCK_USERS } from '../../data/mockData';

export const PeoplePage = () => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');

  const roles = ['All', 'Founder', 'Investor', 'Mentor'];

  const filteredUsers = MOCK_USERS.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.headline?.toLowerCase().includes(search.toLowerCase()) ||
                          u.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = selectedRole === 'All' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Explore People & Founders</h1>
        <p className="text-xs text-slate-500 mt-1">Discover verified entrepreneurs, VCs, and mentors</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-soft-sm">
        <div className="flex-1 w-full">
          <Input
            icon={Search}
            placeholder="Search by name, skills, location, organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <PeopleCard key={u.id} user={u} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No Members Found"
          description={`No members matched your search query "${search}".`}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setSelectedRole('All');
          }}
        />
      )}
    </div>
  );
};
