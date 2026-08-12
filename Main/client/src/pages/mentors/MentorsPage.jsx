import React from 'react';
import { Award } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const MentorsPage = () => <div className="mx-auto max-w-4xl"><EmptyState icon={Award} title="Mentor directory is not available yet" description="BACKEND GAP: TrustNet has no mentor-directory or mentorship-booking API contract, so no mentor data or booking controls are shown." /></div>;
