import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Folder, ArrowLeft, Plus, Settings, User, Users, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import * as workspaceApi from '../../lib/workspaceApi';
import * as startupApi from '../../lib/startupApi';
import * as projectApi from '../../lib/projectApi';
import { normalizeStartup } from '../../lib/adapters/startupAdapter';

export const WorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { currentUser } = useAuth();

  const [startup, setStartup] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [workspacesList, setWorkspacesList] = useState([]); // Used when listing all workspaces
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Workspace Creation/Edit states
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState('team');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Project Creation states
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState('planning');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const fetchWorkspaceData = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (!id) {
        // Global /app/workspace route - list all workspaces accessible to user
        const list = await workspaceApi.listWorkspaces();
        setWorkspacesList(list || []);
      } else {
        // Specific workspace or startup ID
        let currentWorkspace = null;
        let currentStartup = null;

        try {
          // 1. Try treating it as a workspace ID directly
          currentWorkspace = await workspaceApi.getWorkspace(id);
          if (currentWorkspace) {
            const startupRaw = await startupApi.getStartup(currentWorkspace.startup);
            currentStartup = normalizeStartup(startupRaw);
          }
        } catch (err) {
          // 2. Treat as startup ID and search for its workspace
          const startupRaw = await startupApi.getStartup(id);
          currentStartup = normalizeStartup(startupRaw);
          
          const workspaces = await workspaceApi.listWorkspaces({ startup: id });
          if (workspaces && workspaces.length > 0) {
            currentWorkspace = workspaces[0];
          }
        }

        setStartup(currentStartup);
        setWorkspace(currentWorkspace);

        if (currentWorkspace) {
          setNewName(currentWorkspace.name);
          setNewDescription(currentWorkspace.description || '');
          setNewVisibility(currentWorkspace.settings?.defaultVisibility || 'team');

          // Fetch project members for this workspace
          const membersList = await workspaceApi.listWorkspaceMembers(currentWorkspace._id || currentWorkspace.id);
          setMembers(membersList || []);

          // Fetch real projects for this workspace
          const projectsList = await projectApi.listProjects(currentWorkspace._id || currentWorkspace.id);
          setProjects(projectsList || []);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve workspace data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !startup) return;

    setIsSubmitting(true);
    try {
      const payload = {
        startupId: startup.id,
        name: newName.trim(),
        description: newDescription.trim(),
        settings: {
          defaultVisibility: newVisibility
        }
      };

      const created = await workspaceApi.createWorkspace(payload);
      setWorkspace(created);
      showToast('Workspace Initialized', `Successfully created workspace: ${created.name}`, 'success');
      fetchWorkspaceData();
    } catch (err) {
      showToast('Initialization Failed', err.message || 'Failed to create workspace.', 'rose');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !workspace) return;

    setIsSubmitting(true);
    try {
      const updated = await workspaceApi.updateWorkspace(workspace._id || workspace.id, {
        name: newName.trim(),
        description: newDescription.trim(),
        settings: {
          defaultVisibility: newVisibility
        }
      });
      setWorkspace(updated);
      setIsEditing(false);
      showToast('Workspace Updated', 'Successfully saved workspace settings.', 'success');
    } catch (err) {
      showToast('Update Failed', err.message || 'Failed to save workspace.', 'rose');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !workspace) return;

    setIsCreatingProject(true);
    try {
      const payload = {
        workspaceId: workspace._id || workspace.id,
        name: projectName.trim(),
        description: projectDescription.trim(),
        status: projectStatus
      };

      await projectApi.createProject(payload);
      setProjectName('');
      setProjectDescription('');
      setProjectStatus('planning');
      setShowProjectForm(false);
      showToast('Project Created', 'Project added successfully.', 'success');

      // Refresh project list
      const projectsList = await projectApi.listProjects(workspace._id || workspace.id);
      setProjects(projectsList || []);
    } catch (err) {
      showToast('Creation Failed', err.message || 'Failed to create project.', 'rose');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleUpdateProjectStatus = async (projectId, newStatus) => {
    try {
      await projectApi.updateProject(projectId, { status: newStatus });
      showToast('Status Updated', 'Project status updated successfully.', 'success');
      // Refresh project list
      const projectsList = await projectApi.listProjects(workspace._id || workspace.id);
      setProjects(projectsList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to update project status.', 'rose');
    }
  };

  const handleArchiveProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to archive this project?')) return;
    try {
      await projectApi.archiveProject(projectId);
      showToast('Project Archived', 'Project has been archived.', 'success');
      // Refresh project list
      const projectsList = await projectApi.listProjects(workspace._id || workspace.id);
      setProjects(projectsList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to archive project.', 'rose');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex items-center justify-center">
        <p className="text-sm font-mono text-[#5B6472] animate-pulse">Loading workspace details...</p>
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
          onClick={fetchWorkspaceData}
        >
          Retry
        </Button>
      </div>
    );
  }

  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwner = workspace && String(workspace.owner) === String(currentUserId);
  const isFounder = startup && String(startup.founderId) === String(currentUserId);
  const isWorkspaceWriteAdmin = isOwner || (members.some(m => String(m.id || m.user) === String(currentUserId) && (m.role === 'admin' || m.role === 'owner')));

  // GLOBAL WORKSPACE LISTING VIEW
  if (!id) {
    return (
      <div className="bg-[#F7F5EF] text-[#0E1A2B] font-sans p-6 sm:p-8 min-h-screen -m-6 sm:-m-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-[#0E1A2B] tracking-tight">
            Collaboration Workspaces
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-sans">
            Select a workspace to view sprint progress, active team members, and milestones.
          </p>
        </div>

        {workspacesList.length === 0 ? (
          <Card className="bg-white p-8 rounded-[8px] border border-dashed border-[#5B6472]/30 shadow-[0_2px_8px_rgba(14,26,43,0.08)] text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-[#0F6E5C]/10 text-[#0F6E5C] rounded-full flex items-center justify-center mx-auto">
              <Folder className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-[#0E1A2B]">No Workspaces Found</h3>
            <p className="text-xs text-[#5B6472] max-w-xs mx-auto leading-relaxed">
              You do not have access to any active team workspaces. Try visiting one of your startup profile dashboards first.
            </p>
            <Button
              variant="primary"
              className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
              onClick={() => navigate('/app/startups')}
            >
              Go to My Startups
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspacesList.map((ws) => (
              <Card
                key={ws._id}
                className="bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] p-6 hover:shadow-[0_4px_12px_rgba(14,26,43,0.12)] transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-[#0F6E5C]" />
                    <h3 className="text-sm font-bold text-[#0E1A2B]">{ws.name}</h3>
                  </div>
                  <p className="text-xs text-[#5B6472] line-clamp-2 min-h-[32px] leading-relaxed">
                    {ws.description || 'No description provided.'}
                  </p>
                  <div className="text-[10px] font-mono text-[#5B6472]">
                    <span>Visibility: <strong className="uppercase">{ws.settings?.defaultVisibility || 'team'}</strong></span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#5B6472]/10 mt-4">
                  <Link
                    to={`/app/workspaces/${ws._id}`}
                    className="w-full text-center inline-block bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white text-xs font-semibold py-2 px-3 rounded-[4px] transition-colors"
                  >
                    Enter Workspace
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // DETAILED SINGLE WORKSPACE VIEW
  return (
    <div className="bg-[#F7F5EF] text-[#0E1A2B] font-sans p-6 sm:p-8 min-h-screen -m-6 sm:-m-8 space-y-6">
      {/* Breadcrumbs & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#5B6472]/10 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-[#5B6472]">
          <Link to="/app/startups" className="hover:text-[#0E1A2B] transition-colors">Startups</Link>
          <span>/</span>
          {startup && (
            <Link to={`/app/startups/${startup.id}`} className="hover:text-[#0E1A2B] transition-colors">{startup.name}</Link>
          )}
          <span>/</span>
          <span className="text-[#0F6E5C] font-bold">Workspace</span>
        </div>

        <button
          onClick={() => navigate(startup ? `/app/startups/${startup.id}` : '/app/startups')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6472] hover:text-[#0E1A2B] transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Startup Overview</span>
        </button>
      </div>

      {/* Contextual Navigation (Startup Context) */}
      {startup && (
        <div className="flex border-b border-[#5B6472]/20">
          <Link
            to={`/app/startups/${startup.id}`}
            className="px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-[#5B6472] hover:text-[#0E1A2B] font-sans tracking-wide uppercase transition-colors"
          >
            Overview
          </Link>
          <Link
            to={`/app/startups/${startup.id}/team`}
            className="px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-[#5B6472] hover:text-[#0E1A2B] font-sans tracking-wide uppercase transition-colors"
          >
            Team
          </Link>
          <Link
            to={`/app/workspaces/${startup.id}`}
            className="px-4 py-2 text-xs font-bold border-b-2 border-[#0F6E5C] text-[#0F6E5C] font-sans tracking-wide uppercase"
          >
            Workspace
          </Link>
        </div>
      )}

      {/* Roster Empty State - Workspace creation form */}
      {!workspace ? (
        <Card className="bg-white p-6 sm:p-8 rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-[#5B6472]/10 pb-3">
            <Folder className="w-6 h-6 text-[#0F6E5C]" />
            <div>
              <h2 className="text-lg font-display font-black text-[#0E1A2B]">Initialize Workspace</h2>
              <p className="text-[10px] text-[#5B6472]">Create a dedicated space to manage projects and tasks.</p>
            </div>
          </div>

          {isFounder ? (
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <Input
                label="Workspace Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Acme Sprint Workspace"
                required
                disabled={isSubmitting}
                className="rounded-[4px] border-[#5B6472]/30"
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the sprint scope and team goals for this execution area..."
                  disabled={isSubmitting}
                  className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border border-[#5B6472]/30 p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                  Default Visibility
                </label>
                <select
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-3.5 h-11 text-[#0E1A2B] focus:bg-white focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C]"
                >
                  <option value="team">Team (Visible to all members)</option>
                  <option value="private">Private (Invite only)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0 h-11 shadow-[0_2px_8px_rgba(14,26,43,0.08)]"
              >
                Create Workspace
              </Button>
            </form>
          ) : (
            <p className="text-xs text-[#B23A32] font-mono text-center">
              Only the startup founder is authorized to create a workspace.
            </p>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main workspace section (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {isEditing ? (
              <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <h3 className="text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider border-b border-[#5B6472]/10 pb-2">
                  Edit Workspace Settings
                </h3>
                <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                  <Input
                    label="Workspace Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="rounded-[4px] border-[#5B6472]/30"
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border border-[#5B6472]/30 p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Default Visibility
                    </label>
                    <select
                      value={newVisibility}
                      onChange={(e) => setNewVisibility(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-3.5 h-11 text-[#0E1A2B] focus:bg-white focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C]"
                    >
                      <option value="team">Team (Visible to all members)</option>
                      <option value="private">Private (Invite only)</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSubmitting}
                      className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                    >
                      Save Settings
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => setIsEditing(false)}
                      className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <div className="flex items-center justify-between border-b border-[#5B6472]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-[#0F6E5C]" />
                    <h2 className="text-lg font-display font-black text-[#0E1A2B] tracking-tight">{workspace.name}</h2>
                  </div>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px] hover:bg-[#F7F5EF]"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1" />
                      <span>Settings</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#5B6472] uppercase block">Description</span>
                  <p className="text-sm text-[#0E1A2B] leading-relaxed font-sans">
                    {workspace.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#5B6472]/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-[#5B6472]">Visibility: <strong className="uppercase text-[#0E1A2B]">{workspace.settings?.defaultVisibility || 'team'}</strong></span>
                  {workspace.createdAt && (
                    <span className="text-[#5B6472]">
                      Initialized: <strong>{new Date(workspace.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* Project List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider">
                  Sprint Projects ({projects.length})
                </h3>
                {isWorkspaceWriteAdmin && !showProjectForm && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowProjectForm(true)}
                    className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    <span>New Project</span>
                  </Button>
                )}
              </div>

              {/* Project Creation Form */}
              {showProjectForm && (
                <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                  <h4 className="text-xs font-bold text-[#0E1A2B] uppercase">Create New Workspace Project</h4>
                  <form onSubmit={handleCreateProject} className="space-y-3">
                    <Input
                      label="Project Name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                      placeholder="e.g. Q3 Roadmap Deliverable"
                      className="rounded-[4px] border-[#5B6472]/30"
                    />

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        placeholder="Project overview and targets..."
                        className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border border-[#5B6472]/30 p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                        Initial Lifecycle Status
                      </label>
                      <select
                        value={projectStatus}
                        onChange={(e) => setProjectStatus(e.target.value)}
                        className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-3.5 h-11 text-[#0E1A2B] focus:bg-white focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C]"
                      >
                        <option value="planning">Planning (Draft)</option>
                        <option value="active">Active (Sprint Run)</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isCreatingProject}
                        className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                      >
                        Create Project
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowProjectForm(false)}
                        className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Projects Grid */}
              {projects.length === 0 ? (
                <Card className="p-6 text-center text-xs text-[#5B6472] bg-white border border-dashed border-[#5B6472]/30 rounded-[8px]">
                  No active projects initialized in this workspace.
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((proj) => (
                    <Card
                      key={proj._id}
                      className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[#0E1A2B] line-clamp-1">
                             <Link to={`/app/projects/${proj._id}`} className="hover:text-[#0F6E5C] transition-colors">
                               {proj.name}
                             </Link>
                          </h4>
                          {isWorkspaceWriteAdmin && (
                            <button
                              onClick={() => handleArchiveProject(proj._id)}
                              className="text-[#B23A32]/70 hover:text-[#B23A32] p-1 transition-colors"
                              title="Archive Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-[#5B6472] leading-relaxed line-clamp-2 min-h-[30px]">
                          {proj.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#5B6472]/10 mt-3 flex items-center justify-between">
                        {/* Project status using LedgerStamp */}
                        <LedgerStamp status={proj.status} date={proj.updatedAt || proj.createdAt} />

                        {isWorkspaceWriteAdmin ? (
                          <select
                            value={proj.status}
                            onChange={(e) => handleUpdateProjectStatus(proj._id, e.target.value)}
                            className="bg-[#F7F5EF] border border-[#5B6472]/30 text-[10px] rounded-[4px] px-1.5 py-0.5 text-[#0E1A2B] focus:outline-none"
                          >
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="on_hold">On Hold</option>
                            <option value="completed">Completed</option>
                          </select>
                        ) : (
                          <span className="text-[9px] font-mono font-bold uppercase bg-[#F7F5EF] border border-[#5B6472]/20 text-[#5B6472] px-1.5 py-0.5 rounded-[4px]">
                            {proj.status}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Task Board Card Placeholder (Tasks are future-task scope) */}
            <div className="pt-2">
              <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-2 opacity-75">
                <div className="flex items-center justify-between">
                  <CheckCircle2 className="w-5 h-5 text-[#5B6472]" />
                  <span className="text-[9px] font-mono font-bold bg-[#C8862B]/10 text-[#C8862B] px-1.5 py-0.5 rounded-[4px]">FUTURE IDEA</span>
                </div>
                <h4 className="text-xs font-semibold text-[#0E1A2B]">Sprint Task Boards</h4>
                <p className="text-[10px] text-[#5B6472] leading-relaxed">Assign execution tasks, check priorities, and update sprint statuses.</p>
              </Card>
            </div>
          </div>

          {/* Projection: Workspace Members (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] overflow-hidden">
              <div className="p-4 border-b border-[#5B6472]/10 bg-[#F7F5EF]/30">
                <h3 className="text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#5B6472]" /> Active Members ({members.length})
                </h3>
              </div>

              {members.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#5B6472]">
                  No active members mapped on this workspace roster.
                </div>
              ) : (
                <div className="divide-y divide-[#5B6472]/10">
                  {members.map((member) => (
                    <div key={member.id || member.email} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[4px] bg-[#F7F5EF] flex items-center justify-center border border-[#5B6472]/10">
                          <User className="w-4 h-4 text-[#5B6472]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#0E1A2B]">
                            {member.name || member.email.split('@')[0]}
                          </h4>
                          <p className="text-[9px] text-[#5B6472] font-mono">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold uppercase bg-[#F7F5EF] border border-[#5B6472]/20 text-[#5B6472] px-2 py-0.5 rounded-[4px]">
                          {member.role === 'contributor' ? 'member' : member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
