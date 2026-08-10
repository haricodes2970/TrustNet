import React, { useEffect, useState } from 'react';
import { Mail, AlertCircle, RefreshCw, XCircle, CheckCircle, Play, CheckCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LedgerStamp } from '../../components/common/LedgerStamp';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import * as engagementRequestApi from '../../lib/engagementRequestApi';
import * as marketplaceApi from '../../lib/marketplaceApi';
import * as startupApi from '../../lib/startupApi';
import { apiClient } from '../../lib/apiClient';

export const EngagementRequestsPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState('sent'); // 'sent' or 'received'
  const [providerProfile, setProviderProfile] = useState(null);
  
  // Data Lists
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  
  // Lookups for Names (since raw IDs are returned)
  const [listingLookup, setListingLookup] = useState({});
  const [startupLookup, setStartupLookup] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Fetch Lookups (all active startups and public service listings)
      const [allStartups, allListings] = await Promise.all([
        startupApi.listStartups(),
        marketplaceApi.listServiceListings(),
      ]);

      const startupMap = {};
      allStartups.forEach(s => {
        startupMap[s._id || s.id] = s.name;
      });

      const listingMap = {};
      allListings.forEach(l => {
        listingMap[l._id || l.id] = l.title;
      });

      // 2. Fetch provider profile for the current user
      const profiles = await apiClient.get('/provider-profiles');
      const myProfile = profiles.find(
        (p) => String(p.user) === String(currentUser?._id || currentUser?.id)
      );

      // 3. Fetch Sent Requests (default filters to caller's submissions)
      const sent = await engagementRequestApi.listRequests();
      setSentRequests(sent || []);

      // 4. Fetch Received Requests (if provider profile exists)
      if (myProfile) {
        setProviderProfile(myProfile);
        
        // Fetch all provider listings (including drafts/archived)
        const myListings = await marketplaceApi.listServiceListings({ provider: myProfile._id });
        myListings.forEach(l => {
          listingMap[l._id || l.id] = l.title;
        });

        // Loop over provider listings and fetch their requests in parallel
        const receivedPromises = myListings.map(l =>
          engagementRequestApi.listRequests({ serviceListingId: l._id || l.id })
        );
        const receivedArrays = await Promise.all(receivedPromises);
        const received = receivedArrays.flat();
        
        setReceivedRequests(received || []);
      } else {
        setProviderProfile(null);
        setReceivedRequests([]);
      }

      setStartupLookup(startupMap);
      setListingLookup(listingMap);
    } catch (err) {
      setError(err.message || 'Failed to load engagement requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelRequest = async (id) => {
    setActionLoading(id);
    try {
      await engagementRequestApi.cancelRequest(id);
      showToast('Request Cancelled', 'Your startup engagement request was cancelled.', 'success');
      await loadData();
    } catch (err) {
      showToast('Cancellation Failed', err.message || 'Could not cancel request.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    setActionLoading(id);
    try {
      await engagementRequestApi.updateStatus(id, nextStatus);
      showToast('Status Updated', `Request has been marked as ${nextStatus}.`, 'success');
      await loadData();
    } catch (err) {
      showToast('Update Failed', err.message || 'Could not update status.', 'error');
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
            Engagement Workflows
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-ui">
            Manage your service hires or client request pipelines, approve scopes, and track project completion.
          </p>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-[#5B6472]/15 pb-2 gap-4">
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-3 py-2 text-xs font-bold border-b-2 rounded-t-sm focus:outline-none transition-all ${
              activeTab === 'sent'
                ? 'border-[#0F6E5C] text-[#0F6E5C]'
                : 'border-transparent text-[#5B6472] hover:text-[#0E1A2B]'
            }`}
          >
            Sent Requests (Client)
          </button>
          
          {providerProfile && (
            <button
              onClick={() => setActiveTab('received')}
              className={`px-3 py-2 text-xs font-bold border-b-2 rounded-t-sm focus:outline-none transition-all ${
                activeTab === 'received'
                  ? 'border-[#0F6E5C] text-[#0F6E5C]'
                  : 'border-transparent text-[#5B6472] hover:text-[#0E1A2B]'
              }`}
            >
              Received Requests (Provider)
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] space-y-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-1/3 bg-slate-200 rounded" />
                  <div className="h-6 w-24 bg-slate-100 rounded" />
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded" />
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
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Retry Load</span>
            </Button>
          </Card>
        )}

        {/* Empty States */}
        {!isLoading && !error && activeTab === 'sent' && sentRequests.length === 0 && (
          <EmptyState 
            icon={Mail} 
            title="No Hired Services" 
            description="You have not submitted any service engagement requests from your startups yet."
            actionLabel="Browse Marketplace"
            onAction={() => navigate('/app/discover/marketplace')}
            className="bg-white border border-[#5B6472]/20 rounded-[8px]"
          />
        )}

        {!isLoading && !error && activeTab === 'received' && receivedRequests.length === 0 && (
          <EmptyState 
            icon={Mail} 
            title="Inbox Empty" 
            description="You have not received any engagement requests for your service listings yet."
            className="bg-white border border-[#5B6472]/20 rounded-[8px]"
          />
        )}

        {/* Requests List */}
        {!isLoading && !error && (
          <div className="space-y-4">
            {((activeTab === 'sent' ? sentRequests : receivedRequests)).map((req) => {
              const isBusy = actionLoading === req._id;
              
              const listingName = listingLookup[req.serviceListing] || `Service listing ...${String(req.serviceListing).slice(-6)}`;
              const startupName = startupLookup[req.startup] || `Startup ...${String(req.startup).slice(-6)}`;

              return (
                <Card 
                  key={req._id || req.id} 
                  className="p-5 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_6px_rgba(14,26,43,0.02)] space-y-4 text-[#0E1A2B]"
                >
                  {/* Card Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-[#5B6472] font-mono">
                        Workflow Record
                      </div>
                      <h3 className="text-sm font-bold text-[#0E1A2B] font-ui">
                        {listingName}
                      </h3>
                      <p className="text-xs text-[#5B6472] font-ui">
                        Client: <span className="font-semibold text-[#0E1A2B]">{startupName}</span>
                      </p>
                    </div>

                    {/* Status LedgerStamp */}
                    <div className="flex-shrink-0">
                      <LedgerStamp 
                        label="Status" 
                        state={req.status} 
                        timestamp={req.updatedAt || req.createdAt} 
                      />
                    </div>
                  </div>

                  {/* Scope Message */}
                  {req.message && (
                    <div className="bg-[#F7F5EF]/75 p-3 rounded-[4px] border border-[#5B6472]/15">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-[#5B6472] font-mono mb-1">Project Scope Message</div>
                      <p className="text-xs text-[#0E1A2B] font-ui whitespace-pre-line leading-relaxed">
                        {req.message}
                      </p>
                    </div>
                  )}

                  {/* Audit details */}
                  <div className="text-[9px] font-mono text-[#5B6472] space-y-0.5">
                    <div>Request ID: {req._id || req.id}</div>
                    <div>Timestamp: {req.createdAt ? new Date(req.createdAt).toUTCString() : 'N/A'}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-[#5B6472]/10 flex flex-wrap gap-2.5 justify-end">
                    
                    {/* CLIENT ACTIONS: Cancel request */}
                    {activeTab === 'sent' && (req.status === 'requested' || req.status === 'accepted') && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleCancelRequest(req._id)}
                        disabled={isBusy}
                        className="rounded-[4px] border-[#B23A32]/35 text-[#B23A32] hover:bg-[#B23A32]/5 text-[11px] font-bold flex items-center gap-1 shadow-none"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Request</span>
                      </Button>
                    )}

                    {/* PROVIDER ACTIONS */}
                    {activeTab === 'received' && (
                      <>
                        {/* advancing "requested" -> accept or decline */}
                        {req.status === 'requested' && (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleUpdateStatus(req._id, 'declined')}
                              disabled={isBusy}
                              className="rounded-[4px] border-[#B23A32]/35 text-[#B23A32] hover:bg-[#B23A32]/5 text-[11px] font-bold flex items-center gap-1 shadow-none"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleUpdateStatus(req._id, 'accepted')}
                              disabled={isBusy}
                              className="rounded-[4px] bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-none"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Accept Request</span>
                            </Button>
                          </>
                        )}

                        {/* advancing "accepted" -> start work or decline */}
                        {req.status === 'accepted' && (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleUpdateStatus(req._id, 'declined')}
                              disabled={isBusy}
                              className="rounded-[4px] border-[#B23A32]/35 text-[#B23A32] hover:bg-[#B23A32]/5 text-[11px] font-bold flex items-center gap-1 shadow-none"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleUpdateStatus(req._id, 'in_progress')}
                              disabled={isBusy}
                              className="rounded-[4px] bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-none"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Start Work</span>
                            </Button>
                          </>
                        )}

                        {/* advancing "in_progress" -> complete work */}
                        {req.status === 'in_progress' && (
                          <Button
                            size="xs"
                            onClick={() => handleUpdateStatus(req._id, 'completed')}
                            disabled={isBusy}
                            className="rounded-[4px] bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-none"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Complete Work</span>
                          </Button>
                        )}
                      </>
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
