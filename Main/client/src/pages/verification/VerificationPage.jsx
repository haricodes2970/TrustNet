import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  FileCheck, 
  Rocket, 
  Globe, 
  FileText, 
  Lock, 
  Loader2 
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { IdentityUploadCard } from '../../components/ui/IdentityUploadCard';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, getToken } from '../../lib/apiClient';

export const VerificationPage = () => {
  const { showToast } = useApp();
  const { currentUser } = useAuth();
  
  const [docsState, setDocsState] = useState({
    government_id: { file: null, progress: 0, status: 'idle', errorMessage: '' },
    company_registration: { file: null, progress: 0, status: 'idle', errorMessage: '' },
    business_website: { file: null, progress: 0, status: 'idle', errorMessage: '' },
    linkedin: { file: null, progress: 0, status: 'idle', errorMessage: '' }
  });

  const [verificationStatus, setVerificationStatus] = useState('draft'); // 'draft' | 'pending' | 'approved' | 'rejected' | 'resubmission_requested'
  const [accountStatus, setAccountStatus] = useState('EMAIL_PENDING');
  const [submittedAt, setSubmittedAt] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchStatus = async () => {
    setIsPageLoading(true);
    setPageError('');
    try {
      const token = getToken();
      const response = await fetch(`${BASE_URL}/verification`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Failed to fetch verification status.');
      }
      const data = res.data;
      setVerificationStatus(data.status);
      setAccountStatus(data.accountStatus);
      setSubmittedAt(data.submittedAt);

      // Map backend documents array back to docsState
      const nextDocs = {
        government_id: { file: null, progress: 0, status: 'idle', errorMessage: '' },
        company_registration: { file: null, progress: 0, status: 'idle', errorMessage: '' },
        business_website: { file: null, progress: 0, status: 'idle', errorMessage: '' },
        linkedin: { file: null, progress: 0, status: 'idle', errorMessage: '' }
      };

      if (data.documents) {
        data.documents.forEach(doc => {
          if (nextDocs[doc.type]) {
            nextDocs[doc.type] = {
              file: { name: doc.name },
              progress: 100,
              status: 'success',
              errorMessage: '',
              docStatus: doc.status, // 'draft' | 'pending' | 'approved' | 'rejected'
              rejectionReason: doc.rejectionReason
            };
          }
        });
      }
      setDocsState(nextDocs);
    } catch (err) {
      setPageError(err.message || 'Failed to load verification profile.');
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleUploadFile = async (type, file, validationError) => {
    if (validationError) {
      setDocsState(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'error', errorMessage: validationError }
      }));
      return;
    }

    if (!file) return;

    // Set state to uploading
    setDocsState(prev => ({
      ...prev,
      [type]: { file, progress: 0, status: 'uploading', errorMessage: '' }
    }));

    const token = getToken();
    const formData = new FormData();
    formData.append('document', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/verification/documents/${type}`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setDocsState(prev => ({
          ...prev,
          [type]: { ...prev[type], progress: percent }
        }));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          setDocsState(prev => ({
            ...prev,
            [type]: { file, progress: 100, status: 'success', errorMessage: '' }
          }));
          showToast('Document Uploaded', `${file.name} uploaded successfully.`, 'success');
        } catch (e) {
          setDocsState(prev => ({
            ...prev,
            [type]: { file, progress: 0, status: 'error', errorMessage: 'Invalid response from server.' }
          }));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          setDocsState(prev => ({
            ...prev,
            [type]: { file, progress: 0, status: 'error', errorMessage: res.message || 'Upload failed.' }
          }));
        } catch (e) {
          setDocsState(prev => ({
            ...prev,
            [type]: { file, progress: 0, status: 'error', errorMessage: `Upload failed (Status ${xhr.status}).` }
          }));
        }
      }
    };

    xhr.onerror = () => {
      setDocsState(prev => ({
        ...prev,
        [type]: { file, progress: 0, status: 'error', errorMessage: 'Network connection failure.' }
      }));
    };

    xhr.send(formData);
  };

  const handleRemoveFile = (type) => {
    setDocsState(prev => ({
      ...prev,
      [type]: { file: null, progress: 0, status: 'idle', errorMessage: '' }
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitLoading(true);
    setPageError('');
    try {
      const token = getToken();
      const response = await fetch(`${BASE_URL}/verification/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Failed to submit verification request.');
      }
      showToast('Verification Submitted', 'Your documents have been submitted for admin review.', 'success');
      fetchStatus();
    } catch (err) {
      setPageError(err.message || 'Failed to submit verification request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const allDocumentsUploaded = Object.values(docsState).every(doc => doc.status === 'success');
  const isLocked = ['pending', 'approved'].includes(verificationStatus);

  if (isPageLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-500">Loading your identity verification files...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Identity & Founder Verification</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Get your verified green checkmark badge to boost deal flow trust.
          </p>
        </div>
        <div>
          {verificationStatus === 'approved' && (
            <Badge variant="success" size="lg" className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500 text-white font-bold rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Account</span>
            </Badge>
          )}
          {verificationStatus === 'pending' && (
            <Badge variant="warning" size="lg" className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500 text-white font-bold rounded-full">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Under Review</span>
            </Badge>
          )}
          {(verificationStatus === 'rejected' || verificationStatus === 'resubmission_requested') && (
            <Badge variant="danger" size="lg" className="flex items-center gap-1.5 py-1.5 px-3 bg-red-500 text-white font-bold rounded-full">
              <AlertCircle className="w-4 h-4" />
              <span>Action Required</span>
            </Badge>
          )}
          {verificationStatus === 'draft' && (
            <Badge variant="secondary" size="lg" className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-500 text-white font-bold rounded-full">
              <FileText className="w-4 h-4" />
              <span>Draft Submission</span>
            </Badge>
          )}
        </div>
      </div>

      {pageError && (
        <div className="p-4 text-xs bg-red-50 text-red-600 rounded-2xl border border-red-200 font-medium">
          {pageError}
        </div>
      )}

      {/* Verification status highlights */}
      <LedgerStamp 
        status={verificationStatus} 
        timestamp={submittedAt} 
        className="w-full shadow-soft-sm"
      />

      {/* Grid of upload categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IdentityUploadCard 
          title="Government ID" 
          subtitle="Passport, national ID, or driver's license (JPEG/PNG/PDF up to 10MB)" 
          icon={ShieldCheck} 
          allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
          maxSizeMB={10}
          file={docsState.government_id.file}
          progress={docsState.government_id.progress}
          status={docsState.government_id.status}
          errorMessage={docsState.government_id.errorMessage || (docsState.government_id.docStatus === 'rejected' ? `Rejected: ${docsState.government_id.rejectionReason || 'Invalid details.'}` : '')}
          onFileSelect={(file, err) => handleUploadFile('government_id', file, err)}
          onRemove={() => handleRemoveFile('government_id')}
        />

        <IdentityUploadCard 
          title="Company Registration" 
          subtitle="Certificate of incorporation or official formation document" 
          icon={Rocket} 
          allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
          maxSizeMB={10}
          file={docsState.company_registration.file}
          progress={docsState.company_registration.progress}
          status={docsState.company_registration.status}
          errorMessage={docsState.company_registration.errorMessage || (docsState.company_registration.docStatus === 'rejected' ? `Rejected: ${docsState.company_registration.rejectionReason || 'Invalid details.'}` : '')}
          onFileSelect={(file, err) => handleUploadFile('company_registration', file, err)}
          onRemove={() => handleRemoveFile('company_registration')}
        />

        <IdentityUploadCard 
          title="Business Website Proof" 
          subtitle="Screenshot of hosting console or official web bill" 
          icon={Globe} 
          allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
          maxSizeMB={10}
          file={docsState.business_website.file}
          progress={docsState.business_website.progress}
          status={docsState.business_website.status}
          errorMessage={docsState.business_website.errorMessage || (docsState.business_website.docStatus === 'rejected' ? `Rejected: ${docsState.business_website.rejectionReason || 'Invalid details.'}` : '')}
          onFileSelect={(file, err) => handleUploadFile('business_website', file, err)}
          onRemove={() => handleRemoveFile('business_website')}
        />

        <IdentityUploadCard 
          title="LinkedIn Proof" 
          subtitle="PDF export of profile or settings dashboard proof" 
          icon={Users} 
          allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
          maxSizeMB={10}
          file={docsState.linkedin.file}
          progress={docsState.linkedin.progress}
          status={docsState.linkedin.status}
          errorMessage={docsState.linkedin.errorMessage || (docsState.linkedin.docStatus === 'rejected' ? `Rejected: ${docsState.linkedin.rejectionReason || 'Invalid details.'}` : '')}
          onFileSelect={(file, err) => handleUploadFile('linkedin', file, err)}
          onRemove={() => handleRemoveFile('linkedin')}
        />
      </div>

      {/* Validation Checklist & Submission Footer */}
      {!isLocked && (
        <Card className="p-6 border-slate-200 dark:border-slate-800">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Verification Checklist</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-full ${docsState.government_id.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-600">Government ID Uploaded</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-full ${docsState.company_registration.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-600">Company Registration Uploaded</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-full ${docsState.business_website.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-600">Business Website Proof Uploaded</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-full ${docsState.linkedin.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-600">LinkedIn Proof Uploaded</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500 leading-normal max-w-md">
                Ensure all documents match your professional profile credentials. Submitting sends your credentials directly for admin validation.
              </p>
              <Button 
                variant="primary" 
                size="lg" 
                disabled={!allDocumentsUploaded || submitLoading}
                isLoading={submitLoading}
                onClick={handleSubmit}
              >
                <span>Submit Verification Review</span>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
