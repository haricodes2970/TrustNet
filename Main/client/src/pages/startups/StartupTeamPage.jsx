import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Trash2, Shield, User, Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import * as teamApi from '../../lib/teamApi';
import * as startupApi from '../../lib/startupApi';
import { normalizeStartup } from '../../lib/adapters/startupAdapter';

export const StartupTeamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { currentUser } = useAuth();

  const [startup, setStartup] = useState(null);
  const [team, setTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);

  // Team creation state
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const fetchTeamData = async () => {
    try {
      const startupRaw = await startupApi.getStartup(id);
      const normalizedStartup = normalizeStartup(startupRaw);
      setStartup(normalizedStartup);

      // List teams for this startup
      const teams = await teamApi.listTeams({ startup: id });
      if (teams && teams.length > 0) {
        setTeam(teams[0]); // Take the primary team
      } else {
        setTeam(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load team data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [id]);

  const handleCreateTeam = async () => {
    if (!startup) return;
    setIsCreatingTeam(true);
    setError('');
    try {
      const newTeam = await teamApi.createTeam({
        startupId: startup.id,
        name: `${startup.name} Core Team`,
        description: `Core execution team for ${startup.name}.`,
        email: currentUser?.email || ''
      });
      setTeam(newTeam);
      showToast('Team Created', 'Your primary startup team has been initialized.', 'success');
    } catch (err) {
      setError(err.message || 'Failed to initialize team.');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      const result = await teamApi.inviteMember(team._id, {
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole
      });
      // Refresh team data
      setTeam(result.team);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      showToast('Invitation Sent', `Successfully invited ${inviteEmail}`, 'success');
    } catch (err) {
      showToast('Invitation Failed', err.message || 'Failed to send invitation.', 'rose');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    try {
      const updatedTeam = await teamApi.removeMember(team._id, memberId);
      setTeam(updatedTeam);
      showToast('Member Removed', 'Successfully updated team roster.', 'success');
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to remove member.', 'rose');
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      const updatedTeam = await teamApi.changeMemberRole(team._id, memberId, newRole);
      setTeam(updatedTeam);
      showToast('Role Updated', 'Member permission level changed.', 'success');
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to update role.', 'rose');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex items-center justify-center">
        <p className="text-sm font-mono text-[#5B6472] animate-pulse">Loading team roster...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex flex-col items-center justify-center space-y-4">
        <p className="text-sm font-mono text-[#B23A32]">Error: {error}</p>
        <Button
          variant="outline"
          size="sm"
          className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
          onClick={fetchTeamData}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Authorization checks
  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwner = team && String(team.owner) === String(currentUserId);
  const isTeamAdmin = isOwner || (team && team.members.some(m => String(m.user) === String(currentUserId) && m.status === 'active' && m.role === 'admin'));
  const isFounder = startup && String(startup.founderId) === String(currentUserId);
  const isRoleAdmin = isOwner || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'administrator';

  return (
    <div className="bg-[#F7F5EF] text-[#0E1A2B] font-sans p-6 sm:p-8 min-h-screen -m-6 sm:-m-8 space-y-6">
      {/* Breadcrumbs & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#5B6472]/10 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-[#5B6472]">
          <Link to="/app/startups" className="hover:text-[#0E1A2B] transition-colors">Startups</Link>
          <span>/</span>
          <Link to={`/app/startups/${startup?.id}`} className="hover:text-[#0E1A2B] transition-colors">{startup?.name}</Link>
          <span>/</span>
          <span className="text-[#0F6E5C] font-bold">Team</span>
        </div>

        <button
          onClick={() => navigate(`/app/startups/${id}`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6472] hover:text-[#0E1A2B] transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Startup Overview</span>
        </button>
      </div>

      {/* Contextual Navigation (Startup Context) */}
      <div className="flex border-b border-[#5B6472]/20">
        <Link
          to={`/app/startups/${id}`}
          className="px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-[#5B6472] hover:text-[#0E1A2B] font-sans tracking-wide uppercase transition-colors"
        >
          Overview
        </Link>
        <Link
          to={`/app/startups/${id}/team`}
          className="px-4 py-2 text-xs font-bold border-b-2 border-[#0F6E5C] text-[#0F6E5C] font-sans tracking-wide uppercase"
        >
          Team
        </Link>
        <Link
          to={`/app/workspaces/${id}`}
          className="px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-[#5B6472] hover:text-[#0E1A2B] font-sans tracking-wide uppercase transition-colors"
        >
          Workspace
        </Link>
      </div>

      {/* Roster & Roster Empty State */}
      {!team ? (
        <Card className="bg-white p-8 rounded-[8px] border border-dashed border-[#5B6472]/30 shadow-[0_2px_8px_rgba(14,26,43,0.08)] text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-black text-[#0E1A2B]">No Team Registered</h2>
            <p className="text-xs text-[#5B6472] max-w-sm mx-auto leading-relaxed">
              Every startup requires a team roster to collaborate on workspaces and manage roles.
            </p>
          </div>

          {isFounder ? (
            <Button
              variant="primary"
              isLoading={isCreatingTeam}
              className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
              onClick={handleCreateTeam}
            >
              Initialize Startup Team
            </Button>
          ) : (
            <p className="text-xs text-[#B23A32] font-mono">
              Only the startup founder can initialize this team.
            </p>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Roster Table (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] overflow-hidden">
              <div className="p-4 border-b border-[#5B6472]/10 bg-[#F7F5EF]/30 flex justify-between items-center">
                <h3 className="text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                  Active Team Members ({team.memberCount || team.members.length})
                </h3>
              </div>

              <div className="divide-y divide-[#5B6472]/10">
                {team.members.map((member) => {
                  const isMemberSelf = String(member.user) === String(currentUserId);
                  const isMemberOwner = String(member.user) === String(team.owner);
                  
                  return (
                    <div key={member._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[4px] border border-[#5B6472]/20 bg-[#F7F5EF] flex items-center justify-center">
                          <User className="w-5 h-5 text-[#5B6472]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#0E1A2B] flex items-center gap-2">
                            {member.name || member.email.split('@')[0]}
                            {isMemberOwner && (
                              <span className="text-[9px] font-mono bg-[#0F6E5C]/10 text-[#0F6E5C] border border-[#0F6E5C]/20 px-1 rounded-[2px] font-bold">
                                OWNER
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-[#5B6472] font-mono">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-start sm:self-auto">
                        {/* Status LedgerStamp */}
                        <LedgerStamp status={member.status} date={member.invitedAt} />

                        {/* Role selection dropdown */}
                        {isRoleAdmin && !isMemberOwner ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member._id, e.target.value)}
                            className="bg-[#F7F5EF] border border-[#5B6472]/30 text-xs rounded-[4px] px-2 py-1 text-[#0E1A2B] focus:outline-none"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="text-xs font-mono text-[#5B6472] uppercase font-bold bg-[#F7F5EF] border border-[#5B6472]/20 px-2 py-0.5 rounded-[4px]">
                            {member.role}
                          </span>
                        )}

                        {/* Remove / Leave Action */}
                        {!isMemberOwner && (isTeamAdmin || isMemberSelf) && (
                          <button
                            onClick={() => handleRemoveMember(member._id)}
                            title={isMemberSelf ? 'Leave Team' : 'Remove Member'}
                            className="text-[#B23A32] hover:bg-[#B23A32]/10 p-1.5 rounded-[4px] transition-colors border border-[#B23A32]/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Invitation Panel (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {isTeamAdmin ? (
              <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider border-b border-[#5B6472]/10 pb-2 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#0F6E5C]" /> Invite New Member
                  </h3>
                  <p className="text-[10px] text-[#5B6472] mt-1">
                    Send email invitations to co-founders or employees.
                  </p>
                </div>

                <form onSubmit={handleInvite} className="space-y-4">
                  <Input
                    label="Full Name (optional)"
                    icon={User}
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    disabled={isInviting}
                    className="rounded-[4px] border-[#5B6472]/30"
                  />
                  
                  <Input
                    label="Email Address"
                    icon={Mail}
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. sarah@acme.com"
                    disabled={isInviting}
                    required
                    className="rounded-[4px] border-[#5B6472]/30"
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Workspace Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      disabled={isInviting}
                      className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-3.5 h-11 text-[#0E1A2B] focus:bg-white focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C]"
                    >
                      <option value="member">Member (Contributor)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isInviting}
                    className="w-full bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0 h-11"
                  >
                    Send Invitation
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-2 text-center">
                <Shield className="w-8 h-8 text-[#5B6472] mx-auto opacity-55" />
                <h4 className="text-xs font-bold text-[#0E1A2B]">Read-Only Access</h4>
                <p className="text-[10px] text-[#5B6472] leading-relaxed">
                  Only team owners and administrators can invite new members or adjust roles.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
