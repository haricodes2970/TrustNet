import React from 'react';
import { UserPlus } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';

export const ConnectionsPage = () => <div className="mx-auto max-w-4xl"><EmptyState icon={UserPlus} title="Connections are not available yet" description="BACKEND GAP: TrustNet has no connections or connection-request API contract, so this page cannot display or modify connection data." /></div>;
