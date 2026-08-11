import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, Send, ArrowLeft, Building2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import * as marketplaceApi from '../../lib/marketplaceApi';
import * as engagementRequestApi from '../../lib/engagementRequestApi';

export const ServiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { startups, showToast } = useApp();

  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form States
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Filter startups owned by the current logged-in user
  const myStartups = startups.filter(
    (s) => String(s.founderId) === String(currentUser?._id || currentUser?.id)
  );

  const fetchListingDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await marketplaceApi.getServiceListing(id);
      setListing(data);
    } catch (err) {
      setError(err.message || 'Failed to load service listing details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListingDetails();
  }, [id]);

  // Set default selected startup when myStartups changes
  useEffect(() => {
    if (myStartups.length > 0 && !selectedStartupId) {
      setSelectedStartupId(myStartups[0].id);
    }
  }, [myStartups]);

  const handleSubmitEngagement = async (e) => {
    e.preventDefault();
    if (!selectedStartupId) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        serviceListingId: id,
        startupId: selectedStartupId,
        message: requestMessage.trim() || undefined,
      };

      await engagementRequestApi.createRequest(payload);
      
      showToast(
        'Request Submitted',
        'Your engagement request has been recorded. The provider will review it shortly.',
        'success'
      );
      
      setRequestMessage('');
      // Redirect user to the engagement requests dashboard to track status
      navigate('/app/engagement-requests');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit engagement request. You may already have an active request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 flex items-center justify-center" aria-busy="true">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#0F6E5C] animate-spin mx-auto" />
          <p className="text-xs text-[#5B6472] font-mono">RETRIEVING TRUSTNET STATE RECORD...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/discover/marketplace')}
            className="mb-4 text-[#5B6472] hover:text-[#0E1A2B] rounded-[4px]"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to Marketplace</span>
          </Button>
          
          <Card className="p-6 bg-white border border-[#B23A32]/20 rounded-[8px] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#B23A32]/10 text-[#B23A32] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0E1A2B] font-display">Details Unavailable</h3>
              <p className="text-xs text-[#5B6472] mt-1">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchListingDetails}
              className="mx-auto rounded-[4px] border-[#5B6472]/40 text-[#0E1A2B] hover:bg-[#F7F5EF]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Retry Load</span>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const priceText = listing.priceMin
    ? `${listing.currency || 'USD'} ${listing.priceMin.toLocaleString()}${listing.priceMax ? ` - ${listing.priceMax.toLocaleString()}` : '+'}`
    : 'Custom Rate';

  return (
    <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 font-ui text-[#0E1A2B]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate('/app/discover/marketplace')}
          className="flex items-center gap-1 text-xs font-bold text-[#5B6472] hover:text-[#0E1A2B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace Directory</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Main Service Description (Left / 7 cols) */}
          <div className="md:col-span-7 space-y-6">
            <Card className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.03)] space-y-4">
              
              {/* Category & Badge */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase text-[#5B6472] font-mono tracking-wider">
                  {listing.category}
                </span>
                {listing.pricingModel && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-[4px] font-mono">
                    {listing.pricingModel}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold font-display leading-tight text-[#0E1A2B]">
                {listing.title}
              </h2>

              {/* Rate */}
              <div className="p-3 bg-[#F7F5EF] rounded-[4px] border border-[#5B6472]/10 space-y-1">
                <div className="text-[10px] text-[#5B6472] font-mono uppercase tracking-wider font-bold">Pricing Model Details</div>
                <div className="text-sm font-black font-mono text-[#0E1A2B]">
                  {priceText}
                </div>
              </div>

              {/* Description Details */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-bold tracking-wider text-[#5B6472] font-mono">
                  Service Description
                </h3>
                <p className="text-sm text-[#0E1A2B] leading-relaxed whitespace-pre-line font-ui">
                  {listing.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Tags */}
              {listing.tags && listing.tags.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-[#5B6472] font-mono">
                    Keywords
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2.5 py-0.5 bg-slate-100 text-[#5B6472] rounded-[4px] font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Info */}
              <div className="pt-4 border-t border-[#5B6472]/10 space-y-1.5 text-xs text-[#5B6472]">
                <div className="font-mono text-[9px] uppercase font-bold tracking-wider">Audit Metadata</div>
                <div className="font-mono">Provider ID: {listing.provider}</div>
                <div className="font-mono">Listing ID: {listing._id || listing.id}</div>
                <div className="font-mono">Created: {listing.createdAt ? new Date(listing.createdAt).toLocaleString() : 'N/A'}</div>
              </div>

            </Card>
          </div>

          {/* Engagement Request Form Panel (Right / 5 cols) */}
          <div className="md:col-span-5">
            <Card className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_8px_rgba(14,26,43,0.03)] space-y-4 text-[#0E1A2B]">
              <h3 className="text-md font-bold font-display text-[#0E1A2B]">Request Engagement</h3>
              <p className="text-xs text-[#5B6472] leading-relaxed">
                Connect your startup with this service provider to begin collaboration. All requests undergo KYC verification.
              </p>

              {myStartups.length === 0 ? (
                // Non-Founder Warning
                <div className="p-4 bg-[#C8862B]/10 border border-[#C8862B]/20 rounded-[4px] space-y-2 text-[#C8862B]">
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span>STARTUP NOT DETECTED</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-ui">
                    You do not own or manage an active startup on TrustNet. To submit an engagement request, you must first register your startup.
                  </p>
                  <Button
                    onClick={() => navigate('/app/startups/create')}
                    className="w-full bg-[#C8862B] hover:bg-[#C8862B]/90 text-white rounded-[4px] py-1.5 text-[10px] font-bold shadow-none"
                  >
                    Register Startup
                  </Button>
                </div>
              ) : (
                // Request Submission Form
                <form onSubmit={handleSubmitEngagement} className="space-y-4">
                  {submitError && (
                    <div className="p-3 bg-[#B23A32]/10 border border-[#B23A32]/25 rounded-[4px] flex items-center gap-2 text-[#B23A32] text-xs font-mono">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Startup Select */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="startup-select" className="text-xs font-bold text-[#5B6472]">
                      Select Requesting Startup <span className="text-[#B23A32]">*</span>
                    </label>
                    <select
                      id="startup-select"
                      required
                      value={selectedStartupId}
                      onChange={(e) => setSelectedStartupId(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-white border border-[#5B6472]/30 rounded-[4px] px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F6E5C] focus:border-[#0F6E5C] text-[#0E1A2B] font-ui"
                    >
                      {myStartups.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message Input */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="request-message" className="text-xs font-bold text-[#5B6472]">
                      Scope & Details (Optional)
                    </label>
                    <textarea
                      id="request-message"
                      rows={4}
                      placeholder="Outline the project scope, required deliverables, and timeline expectations..."
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-[#F7F5EF]/30 border border-[#5B6472]/30 rounded-[4px] p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F6E5C] focus:border-[#0F6E5C] placeholder-[#5B6472]/60 font-ui resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !selectedStartupId}
                    className="w-full bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] py-2.5 text-xs font-bold flex items-center justify-center gap-2 focus:ring-2 focus:ring-[#0F6E5C]/30 shadow-none"
                  >
                    {isSubmitting ? (
                      <>
                        <span>Submitting Request...</span>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      </>
                    ) : (
                      <>
                        <span>Submit Engagement Request</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
};
