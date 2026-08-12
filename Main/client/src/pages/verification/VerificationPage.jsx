import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LedgerStamp } from '../../components/ui/LedgerStamp';

import {
  getVerification,
  submitVerification,
  uploadVerificationDocument,
} from '../../lib/verificationApi';


/* ============================================================
   REQUIRED VERIFICATION DOCUMENTS
   ============================================================ */

const requiredDocuments = [
  {
    type: 'government_id',
    title: 'Government-issued ID',
    description:
      'Passport, driving licence, or national identity card.',
  },
  {
    type: 'company_registration',
    title: 'Company registration',
    description:
      'Your incorporation or registration document.',
  },
  {
    type: 'business_website',
    title: 'Business website evidence',
    description:
      'A supporting document or screenshot for your business.',
  },
  {
    type: 'linkedin',
    title: 'LinkedIn profile evidence',
    description:
      'A profile export or supporting screenshot.',
  },
];


/* ============================================================
   DATE FORMATTER
   ============================================================ */

const formatDate = (value) => {
  if (!value) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
};


/* ============================================================
   VERIFICATION PAGE
   ============================================================ */

export const VerificationPage = () => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');


  /* ==========================================================
     LOAD VERIFICATION
     ========================================================== */

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getVerification();
      setVerification(data);
    } catch (err) {
      setError(
        err.message ||
          'Your verification details could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    load();
  }, []);


  /* ==========================================================
     DOCUMENT MAP
     ========================================================== */

  const documentMap = useMemo(() => {
    return new Map(
      (verification?.documents || []).map((document) => [
        document.type,
        document,
      ])
    );
  }, [verification]);


  /* ==========================================================
     STATUS
     ========================================================== */

  const status = verification?.status;

  const isPending = status === 'pending';

  const isApproved = status === 'approved';

  const isRejected =
    status === 'rejected' ||
    status === 'resubmission_requested';

  const allUploaded = requiredDocuments.every((item) =>
    documentMap.has(item.type)
  );


  /* ==========================================================
     UPLOAD DOCUMENT
     ========================================================== */

  const handleUpload = async (type, file) => {
    if (!file || isPending || isApproved) {
      return;
    }

    setSavingType(type);
    setError('');

    try {
      const updated = await uploadVerificationDocument(
        type,
        file
      );

      setVerification(updated);
    } catch (err) {
      setError(
        err.message ||
          'This document could not be uploaded.'
      );
    } finally {
      setSavingType('');
    }
  };


  /* ==========================================================
     SUBMIT VERIFICATION
     ========================================================== */

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const updated = await submitVerification();
      setVerification(updated);
    } catch (err) {
      setError(
        err.message ||
          'Your verification could not be submitted.'
      );
    } finally {
      setSubmitting(false);
    }
  };


  /* ==========================================================
     LOADING STATE
     ========================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F5EF] px-6 py-10 text-[#0E1A2B]">
        <div className="mx-auto max-w-5xl">

          <div className="flex items-center justify-between border-b border-[#5B6472]/20 pb-6">
            <div className="h-7 w-32 animate-pulse rounded bg-[#0E1A2B]/10" />

            <div className="h-7 w-24 animate-pulse rounded bg-[#0E1A2B]/10" />
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <div className="h-3 w-40 animate-pulse rounded bg-[#0E1A2B]/10" />

            <div className="mt-4 h-12 w-3/4 animate-pulse rounded bg-[#0E1A2B]/10" />

            <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-[#0E1A2B]/10" />

            <div className="mt-10 h-52 animate-pulse rounded-lg bg-[#0E1A2B]/10" />
          </div>

        </div>
      </main>
    );
  }


  /* ==========================================================
     LOAD ERROR
     ========================================================== */

  if (error && !verification) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5EF] px-6 text-[#0E1A2B]">

        <Card className="w-full max-w-xl rounded-lg border border-[#5B6472]/20 bg-[#F7F5EF] p-8 text-center shadow-soft-sm">

          <AlertCircle className="mx-auto h-8 w-8 text-[#B23A32]" />

          <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-[#5B6472]">
            Verification
          </p>

          <h1 className="mt-2 font-display text-3xl text-[#0E1A2B]">
            Verification unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#5B6472]">
            {error}
          </p>

          <Button
            className="mt-6"
            onClick={load}
          >
            Try again
          </Button>

        </Card>

      </main>
    );
  }


  /* ============================================================
     PENDING / UNDER REVIEW

     This is the ONLY page the user should see after submitting
     documents until an administrator approves the account.
     ============================================================ */

  if (isPending) {
    return (
      <main className="min-h-screen bg-[#F7F5EF] text-[#0E1A2B]">

        {/* ======================================================
            STANDALONE HEADER
            ====================================================== */}

        <header className="border-b border-[#5B6472]/20">

          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8 lg:px-10">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center border border-[#0F6E5C] text-[#0F6E5C]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <div className="font-display text-xl text-[#0E1A2B]">
                  TrustNet
                </div>

                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6472]">
                  Identity &amp; Trust
                </div>
              </div>

            </div>

            <div className="hidden items-center gap-2 sm:flex">

              <LockKeyhole className="h-3.5 w-3.5 text-[#0F6E5C]" />

              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6472]">
                Secure review
              </span>

            </div>

          </div>

        </header>


        {/* ======================================================
            MAIN CONTENT
            ====================================================== */}

        <section className="mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-14 lg:px-10">

          {/* Page heading */}

          <div className="grid gap-8 border-b border-[#5B6472]/20 pb-8 md:grid-cols-[1fr_auto] md:items-end">

            <div>

              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#5B6472]">
                Identity verification
              </p>

              <h1 className="mt-3 font-display text-3xl leading-tight text-[#0E1A2B] sm:text-4xl">
                Your verification is under review.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5B6472]">
                Your submitted documents are being reviewed by the
                TrustNet verification team. Verified-only areas remain
                locked until an administrator approves your account.
              </p>

            </div>


            {/* Ledger Stamp */}

            <div className="md:justify-self-end">

              <LedgerStamp
                label="Verification"
                state="pending"
                timestamp={formatDate(
                  verification?.submittedAt ||
                    verification?.reviewedAt
                )}
              />

            </div>

          </div>


          {/* ====================================================
              STATUS PANEL
              ==================================================== */}

          <section className="mt-8">

            <Card className="rounded-lg border border-[#5B6472]/20 bg-[#F7F5EF] p-6 shadow-soft-sm sm:p-8">

              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

                {/* Status icon */}

                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#C8862B]/40 bg-[#C8862B]/10 text-[#C8862B]">

                  <Clock3 className="h-6 w-6" />

                </div>


                <div className="min-w-0">

                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8862B]">
                    Current status
                  </p>

                  <h2 className="mt-2 font-display text-2xl text-[#0E1A2B]">
                    Verification in progress
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B6472]">
                    Your documents have been submitted successfully.
                    An administrator will review them before your
                    verified-only TrustNet areas become available.
                  </p>

                </div>

              </div>


              {/* ==================================================
                  VERIFICATION PROGRESS
                  ================================================== */}

              <div className="mt-8 border-t border-[#5B6472]/15 pt-8">

                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5B6472]">
                  Verification progress
                </p>


                <div className="mt-6 grid gap-6 sm:grid-cols-3">

                  {/* STEP 1 */}

                  <div className="relative">

                    <div className="flex items-start gap-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F6E5C] text-white">

                        <Check className="h-4 w-4" />

                      </div>

                      <div>

                        <p className="text-sm font-semibold text-[#0E1A2B]">
                          Documents submitted
                        </p>

                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#0F6E5C]">
                          Complete
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* STEP 2 */}

                  <div className="relative">

                    <div className="flex items-start gap-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#C8862B] bg-[#F7F5EF] text-[#C8862B]">

                        <Clock3 className="h-4 w-4" />

                      </div>

                      <div>

                        <p className="text-sm font-semibold text-[#0E1A2B]">
                          Administrator review
                        </p>

                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#C8862B]">
                          In progress
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* STEP 3 */}

                  <div className="relative">

                    <div className="flex items-start gap-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#5B6472]/30 text-[#5B6472]">

                        <ShieldCheck className="h-4 w-4" />

                      </div>

                      <div>

                        <p className="text-sm font-semibold text-[#5B6472]">
                          Account approved
                        </p>

                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#5B6472]">
                          Pending review
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  SUBMISSION DETAILS
                  ================================================== */}

              <div className="mt-8 grid gap-4 border-t border-[#5B6472]/15 pt-8 sm:grid-cols-2">

                <div>

                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6472]">
                    Documents received
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#0E1A2B]">
                    {verification?.documents?.length || 0} of{' '}
                    {requiredDocuments.length}
                  </p>

                </div>


                <div>

                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6472]">
                    Submitted
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#0E1A2B]">
                    {formatDate(verification?.submittedAt) ||
                      'Date unavailable'}
                  </p>

                </div>

              </div>


              {/* ==================================================
                  SECURITY NOTE
                  ================================================== */}

              <div className="mt-8 flex items-start gap-3 border-t border-[#5B6472]/15 pt-6">

                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6E5C]" />

                <p className="text-xs leading-5 text-[#5B6472]">
                  Your submitted documents are used for verification
                  purposes and remain protected during the review process.
                </p>

              </div>

            </Card>

          </section>


          {/* Footer note */}

          <p className="mt-6 text-center text-xs text-[#5B6472]">
            You can safely leave this page. Your access will be unlocked
            after administrator approval.
          </p>

        </section>

      </main>
    );
  }


  /* ============================================================
     APPROVED FALLBACK
     ============================================================ */

  if (isApproved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5EF] px-6 text-[#0E1A2B]">

        <Card className="w-full max-w-xl rounded-lg border border-[#5B6472]/20 bg-[#F7F5EF] p-8 text-center shadow-soft-sm">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0F6E5C]/10 text-[#0F6E5C]">

            <CheckCircle2 className="h-6 w-6" />

          </div>

          <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-[#0F6E5C]">
            Identity verified
          </p>

          <h1 className="mt-2 font-display text-3xl text-[#0E1A2B]">
            Your account is approved.
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#5B6472]">
            Your verified-only TrustNet areas are now available.
          </p>

        </Card>

      </main>
    );
  }


  /* ============================================================
     UPLOAD / RESUBMISSION STATE
     ============================================================ */

  const statusMessage = isRejected
    ? 'Your previous submission needs attention. Upload updated documents and resubmit.'
    : 'Upload the four requested documents, then submit them for review.';


  return (
    <main className="min-h-screen bg-[#F7F5EF] text-[#0E1A2B]">

      {/* ========================================================
          HEADER
          ======================================================== */}

      <header className="border-b border-[#5B6472]/20">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8 lg:px-10">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center border border-[#0F6E5C] text-[#0F6E5C]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>

              <div className="font-display text-xl text-[#0E1A2B]">
                TrustNet
              </div>

              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6472]">
                Identity &amp; Trust
              </div>

            </div>

          </div>

          <div className="hidden items-center gap-2 sm:flex">

            <LockKeyhole className="h-3.5 w-3.5 text-[#0F6E5C]" />

            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5B6472]">
              Secure review
            </span>

          </div>

        </div>

      </header>


      {/* ========================================================
          PAGE INTRO
          ======================================================== */}

      <section className="mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-14 lg:px-10">

        <div className="grid gap-8 border-b border-[#5B6472]/20 pb-8 md:grid-cols-[1fr_auto] md:items-end">

          <div>

            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#5B6472]">
              Identity verification
            </p>

            <h1 className="mt-3 font-display text-3xl text-[#0E1A2B] sm:text-4xl">
              Build trust on TrustNet.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5B6472]">
              {statusMessage}
            </p>

          </div>

          <div className="md:justify-self-end">

            <LedgerStamp
              label="Verification"
              state={status || 'draft'}
              timestamp={formatDate(
                verification?.submittedAt ||
                  verification?.reviewedAt
              )}
            />

          </div>

        </div>


        {/* ======================================================
            ERROR
            ====================================================== */}

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 border border-[#B23A32]/30 bg-[#B23A32]/10 p-4 text-sm text-[#B23A32]"
          >

            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{error}</span>

          </div>
        )}


        {/* ======================================================
            DOCUMENT GRID
            ====================================================== */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">

          {requiredDocuments.map((item, index) => {
            const uploaded = documentMap.get(item.type);

            const inputId = `verification-${item.type}`;

            return (
              <Card
                key={item.type}
                className="rounded-lg border border-[#5B6472]/20 bg-[#F7F5EF] p-5 shadow-soft-sm"
              >

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <div className="flex h-9 w-9 items-center justify-center border border-[#0F6E5C]/30 text-[#0F6E5C]">

                      <FileText className="h-4 w-4" />

                    </div>

                    <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B6472]">
                      Document {String(index + 1).padStart(2, '0')}
                    </p>

                    <h2 className="mt-2 font-display text-xl text-[#0E1A2B]">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-sm leading-5 text-[#5B6472]">
                      {uploaded?.name || item.description}
                    </p>

                  </div>


                  {uploaded && (
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 text-[#0F6E5C]"
                      aria-label={`${item.title} uploaded`}
                    />
                  )}

                </div>


                {/* Upload control */}

                <label
                  htmlFor={inputId}
                  className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-[#5B6472]/40 bg-[#F7F5EF] px-3 py-3 text-sm font-semibold text-[#0E1A2B] transition-colors hover:border-[#0F6E5C] hover:text-[#0F6E5C]"
                >

                  <Upload className="h-4 w-4" />

                  {savingType === item.type
                    ? 'Uploading…'
                    : uploaded
                      ? 'Replace file'
                      : 'Choose file'}

                  <input
                    id={inputId}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={Boolean(savingType)}
                    onChange={(event) =>
                      handleUpload(
                        item.type,
                        event.target.files?.[0]
                      )
                    }
                  />

                </label>

              </Card>
            );
          })}

        </section>


        {/* ======================================================
            SUBMIT BAR
            ====================================================== */}

        <section className="mt-6 flex flex-col gap-4 rounded-lg border border-[#5B6472]/20 bg-[#F7F5EF] p-5 shadow-soft-sm sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-semibold text-[#0E1A2B]">
              {allUploaded
                ? 'All required documents are ready.'
                : `${documentMap.size} of ${requiredDocuments.length} required documents uploaded.`}
            </p>

            <p className="mt-1 text-xs text-[#5B6472]">
              Submit once all required documents have been uploaded.
            </p>

          </div>


          <Button
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={!allUploaded}
            isLoading={submitting}
          >
            Submit for review
          </Button>

        </section>


        {/* ======================================================
            SECURITY FOOTER
            ====================================================== */}

        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-[#5B6472]">

          <LockKeyhole className="h-3.5 w-3.5 text-[#0F6E5C]" />

          <span>
            Verification documents are handled securely.
          </span>

        </div>

      </section>

    </main>
  );
};
