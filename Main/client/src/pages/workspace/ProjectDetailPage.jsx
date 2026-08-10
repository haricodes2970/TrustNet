import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Settings, Trash2, CheckCircle2, Folder, Calendar, User, Plus, Clock, AlertCircle, Bookmark, Upload, ExternalLink } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import * as projectApi from '../../lib/projectApi';
import * as workspaceApi from '../../lib/workspaceApi';
import * as startupApi from '../../lib/startupApi';
import * as taskApi from '../../lib/taskApi';
import * as milestoneApi from '../../lib/milestoneApi';
import * as documentApi from '../../lib/documentApi';
import { normalizeStartup } from '../../lib/adapters/startupAdapter';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { currentUser } = useAuth();

  const [project, setProject] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [startup, setStartup] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing Project states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('planning');
  const [isSaving, setIsSaving] = useState(false);

  // Task Creation states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Milestone Creation states
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  // Document Upload states
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);

  // Document Metadata Edit states
  const [editingDoc, setEditingDoc] = useState(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocDescription, setEditDocDescription] = useState('');
  const [isSavingDocMetadata, setIsSavingDocMetadata] = useState(false);

  const fetchProjectData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Get Project details
      const proj = await projectApi.getProject(id);
      setProject(proj);
      setEditName(proj.name);
      setEditDescription(proj.description || '');
      setEditStatus(proj.status);

      // 2. Get Workspace details
      if (proj.workspace) {
        const ws = await workspaceApi.getWorkspace(proj.workspace);
        setWorkspace(ws);

        // Fetch workspace members list
        const membersList = await workspaceApi.listWorkspaceMembers(ws._id || ws.id);
        setMembers(membersList || []);

        // 3. Get Startup details
        if (ws.startup) {
          const startupRaw = await startupApi.getStartup(ws.startup);
          setStartup(normalizeStartup(startupRaw));
        }

        // 4. Fetch Tasks list
        const tasksList = await taskApi.listTasks(proj._id || proj.id);
        setTasks(tasksList || []);

        // 5. Fetch Milestones list
        const milestonesList = await milestoneApi.listMilestones(proj._id || proj.id);
        setMilestones(milestonesList || []);

        // 6. Fetch Documents list
        const docsList = await documentApi.listDocuments(proj._id || proj.id);
        setDocuments(docsList || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load project details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !project) return;

    setIsSaving(true);
    try {
      const updated = await projectApi.updateProject(project._id || project.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        status: editStatus
      });
      setProject(updated);
      setIsEditing(false);
      showToast('Project Updated', 'Successfully saved project updates.', 'success');
    } catch (err) {
      showToast('Update Failed', err.message || 'Failed to save project.', 'rose');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!window.confirm('Are you sure you want to archive this project?')) return;
    try {
      await projectApi.archiveProject(project._id || project.id);
      showToast('Project Archived', 'Successfully archived project.', 'success');
      if (workspace) {
        navigate(`/app/workspaces/${workspace._id || workspace.id}`);
      } else {
        navigate('/app/startups');
      }
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to archive project.', 'rose');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !project) return;

    setIsCreatingTask(true);
    try {
      const payload = {
        projectId: project._id || project.id,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        assignedTo: taskAssignee || undefined
      };

      await taskApi.createTask(payload);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDueDate('');
      setTaskAssignee('');
      setShowTaskForm(false);
      showToast('Task Created', 'Task added successfully.', 'success');

      // Refresh tasks
      const tasksList = await taskApi.listTasks(project._id || project.id);
      setTasks(tasksList || []);
    } catch (err) {
      showToast('Creation Failed', err.message || 'Failed to create task.', 'rose');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await taskApi.updateTask(taskId, { status: newStatus });
      showToast('Task Updated', 'Status changed successfully.', 'success');
      const tasksList = await taskApi.listTasks(project._id || project.id);
      setTasks(tasksList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to update status.', 'rose');
    }
  };

  const handleUpdateTaskAssignee = async (taskId, newAssigneeId) => {
    try {
      await taskApi.updateTask(taskId, { assignedTo: newAssigneeId || null });
      showToast('Task Updated', 'Assignee updated successfully.', 'success');
      const tasksList = await taskApi.listTasks(project._id || project.id);
      setTasks(tasksList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to reassign task.', 'rose');
    }
  };

  const handleUpdateTaskMilestone = async (taskId, milestoneId) => {
    try {
      await taskApi.updateTask(taskId, { milestone: milestoneId || null });
      showToast('Task Updated', 'Milestone group updated.', 'success');
      const tasksList = await taskApi.listTasks(project._id || project.id);
      setTasks(tasksList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to map task to milestone.', 'rose');
    }
  };

  const handleArchiveTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to archive this task?')) return;
    try {
      await taskApi.archiveTask(taskId);
      showToast('Task Archived', 'Task has been archived.', 'success');
      const tasksList = await taskApi.listTasks(project._id || project.id);
      setTasks(tasksList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to archive task.', 'rose');
    }
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !project) return;

    setIsCreatingMilestone(true);
    try {
      const payload = {
        projectId: project._id || project.id,
        title: milestoneTitle.trim(),
        description: milestoneDescription.trim(),
        dueDate: milestoneDueDate || undefined
      };

      await milestoneApi.createMilestone(payload);
      setMilestoneTitle('');
      setMilestoneDescription('');
      setMilestoneDueDate('');
      setShowMilestoneForm(false);
      showToast('Milestone Created', 'Milestone initialized.', 'success');

      // Refresh milestones
      const milestonesList = await milestoneApi.listMilestones(project._id || project.id);
      setMilestones(milestonesList || []);
    } catch (err) {
      showToast('Creation Failed', err.message || 'Failed to create milestone.', 'rose');
    } finally {
      setIsCreatingMilestone(false);
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId, newStatus) => {
    try {
      await milestoneApi.updateMilestone(milestoneId, { status: newStatus });
      showToast('Milestone Updated', 'Status changed successfully.', 'success');
      const milestonesList = await milestoneApi.listMilestones(project._id || project.id);
      setMilestones(milestonesList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to update milestone status.', 'rose');
    }
  };

  const handleArchiveMilestone = async (milestoneId) => {
    if (!window.confirm('Are you sure you want to archive this milestone?')) return;
    try {
      await milestoneApi.archiveMilestone(milestoneId);
      showToast('Milestone Archived', 'Milestone has been archived.', 'success');
      const milestonesList = await milestoneApi.listMilestones(project._id || project.id);
      setMilestones(milestonesList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to archive milestone.', 'rose');
    }
  };

  // Document actions
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFile || !project) return;

    // Check size limit: 20MB Joi/Multer cap
    if (docFile.size > 20 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum file size allowed is 20MB.', 'rose');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', docFile);
      formData.append('projectId', project._id || project.id);
      formData.append('title', docTitle.trim());
      formData.append('description', docDescription.trim());

      await documentApi.uploadDocument(formData);
      setDocTitle('');
      setDocDescription('');
      setDocFile(null);
      setShowDocForm(false);
      showToast('Document Uploaded', 'Successfully uploaded file.', 'success');

      // Refresh documents
      const docsList = await documentApi.listDocuments(project._id || project.id);
      setDocuments(docsList || []);
    } catch (err) {
      showToast('Upload Failed', err.message || 'Failed to upload file.', 'rose');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleUpdateDocMetadata = async (e) => {
    e.preventDefault();
    if (!editDocTitle.trim() || !editingDoc) return;

    setIsSavingDocMetadata(true);
    try {
      const updated = await documentApi.updateDocumentMetadata(editingDoc._id || editingDoc.id, {
        title: editDocTitle.trim(),
        description: editDocDescription.trim()
      });
      setEditingDoc(null);
      showToast('Metadata Updated', 'Saved changes successfully.', 'success');
      // Refresh documents
      const docsList = await documentApi.listDocuments(project._id || project.id);
      setDocuments(docsList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to update metadata.', 'rose');
    } finally {
      setIsSavingDocMetadata(false);
    }
  };

  const handleArchiveDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to archive this document?')) return;
    try {
      await documentApi.archiveDocument(docId);
      showToast('Document Archived', 'Successfully archived document.', 'success');
      // Refresh documents
      const docsList = await documentApi.listDocuments(project._id || project.id);
      setDocuments(docsList || []);
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to archive document.', 'rose');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex items-center justify-center">
        <p className="text-sm font-mono text-[#5B6472] animate-pulse">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex flex-col items-center justify-center space-y-4">
        <p className="text-sm font-mono text-[#B23A32]">Error: {error || 'Project not found.'}</p>
        <Button
          variant="outline"
          size="sm"
          className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Go Back</span>
        </Button>
      </div>
    );
  }

  const currentUserId = currentUser?.id || currentUser?._id;
  const isWorkspaceOwner = workspace && String(workspace.owner) === String(currentUserId);
  const isWorkspaceAdmin = isWorkspaceOwner || members.some(m => String(m.id || m.user) === String(currentUserId) && (m.role === 'admin' || m.role === 'owner'));
  const isContributor = members.some(m => String(m.id || m.user) === String(currentUserId) && m.role === 'contributor');

  const checkCanMutateTask = (task) => {
    if (isWorkspaceAdmin) return true;
    const taskCreator = task.createdBy?._id || task.createdBy;
    const taskAssigneeId = task.assignedTo?._id || task.assignedTo;
    return String(taskCreator) === String(currentUserId) || String(taskAssigneeId) === String(currentUserId);
  };

  const checkCanMutateDoc = (doc) => {
    if (isWorkspaceAdmin) return true;
    const docCreator = doc.createdBy?._id || doc.createdBy;
    return String(docCreator) === String(currentUserId);
  };

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
          {workspace && (
            <Link to={`/app/workspaces/${workspace._id || workspace.id}`} className="hover:text-[#0E1A2B] transition-colors">Workspace</Link>
          )}
          <span>/</span>
          <span className="text-[#0F6E5C] font-bold">{project.name}</span>
        </div>

        <button
          onClick={() => navigate(workspace ? `/app/workspaces/${workspace._id || workspace.id}` : '/app/startups')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6472] hover:text-[#0E1A2B] transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>
      </div>

      {/* Main detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left main card (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {isEditing ? (
            <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
              <h3 className="text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider border-b border-[#5B6472]/10 pb-2">
                Edit Project Settings
              </h3>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <Input
                  label="Project Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  disabled={isSaving}
                  className="rounded-[4px] border-[#5B6472]/30"
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border border-[#5B6472]/30 p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                    Lifecycle Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-3.5 h-11 text-[#0E1A2B] focus:bg-white focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C]"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSaving}
                    className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isSaving}
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
                  <FileText className="w-5 h-5 text-[#0F6E5C]" />
                  <h2 className="text-lg font-display font-black text-[#0E1A2B] tracking-tight">{project.name}</h2>
                </div>
                {isWorkspaceAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px] hover:bg-[#F7F5EF]"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleArchiveProject}
                      className="border border-[#B23A32]/30 text-[#B23A32] hover:bg-[#B23A32]/10 rounded-[4px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      <span>Archive</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#5B6472] uppercase block">Detailed Description</span>
                <p className="text-sm text-[#0E1A2B] leading-relaxed font-sans">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-2 border-t border-[#5B6472]/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[#5B6472]">Status:</span>
                  <LedgerStamp status={project.status} date={project.updatedAt || project.createdAt} />
                </div>
                {project.createdAt && (
                  <span className="text-[#5B6472]">
                    Created: <strong>{new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Real Milestones Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider flex items-center gap-1">
                <Bookmark className="w-4 h-4 text-[#0F6E5C]" /> Milestones ({milestones.length})
              </h3>
              {isWorkspaceAdmin && !showMilestoneForm && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowMilestoneForm(true)}
                  className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>New Milestone</span>
                </Button>
              )}
            </div>

            {/* Milestone creation form */}
            {showMilestoneForm && (
              <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <h4 className="text-xs font-bold text-[#0E1A2B] uppercase">Initialize Milestone</h4>
                <form onSubmit={handleCreateMilestone} className="space-y-3">
                  <Input
                    label="Milestone Title"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    required
                    placeholder="e.g. Beta v1 Launch Release"
                    className="rounded-[4px] border-[#5B6472]/30"
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={milestoneDescription}
                      onChange={(e) => setMilestoneDescription(e.target.value)}
                      placeholder="Objectives and scope..."
                      className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border border-[#5B6472]/30 p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={milestoneDueDate}
                      onChange={(e) => setMilestoneDueDate(e.target.value)}
                      className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-3 h-11 text-[#0E1A2B] focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isCreatingMilestone}
                      className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                    >
                      Create Milestone
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowMilestoneForm(false)}
                      className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Milestones grid list */}
            {milestones.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#5B6472] bg-white border border-dashed border-[#5B6472]/30 rounded-[8px]">
                No active milestones defined for this project.
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {milestones.map((ms) => (
                  <Card
                    key={ms._id}
                    className="p-4 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#0E1A2B] line-clamp-1">{ms.title}</h4>
                        {isWorkspaceAdmin && (
                          <button
                            onClick={() => handleArchiveMilestone(ms._id)}
                            className="text-[#B23A32]/70 hover:text-[#B23A32] p-1 transition-colors"
                            title="Archive Milestone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {ms.description && (
                        <p className="text-[10px] text-[#5B6472] leading-relaxed line-clamp-2">{ms.description}</p>
                      )}
                      {ms.dueDate && (
                        <div className="text-[9px] font-mono text-[#5B6472] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Target: {new Date(ms.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#5B6472]/10 mt-3 flex items-center justify-between">
                      {/* Milestone status using LedgerStamp */}
                      <LedgerStamp status={ms.status} date={ms.updatedAt || ms.createdAt} />

                      {isWorkspaceAdmin ? (
                        <select
                          value={ms.status}
                          onChange={(e) => handleUpdateMilestoneStatus(ms._id, e.target.value)}
                          className="bg-[#F7F5EF] border border-[#5B6472]/30 text-[10px] rounded-[4px] px-1.5 py-0.5 text-[#0E1A2B] focus:outline-none"
                        >
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="missed">Missed</option>
                        </select>
                      ) : (
                        <span className="text-[9px] font-mono font-bold uppercase bg-[#F7F5EF] border border-[#5B6472]/20 text-[#5B6472] px-1.5 py-0.5 rounded-[4px]">
                          {ms.status}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Real Task Manager Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#0F6E5C]" /> Sprint Tasks ({tasks.length})
              </h3>
              {!showTaskForm && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowTaskForm(true)}
                  className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Add Task</span>
                </Button>
              )}
            </div>

            {/* Task Creation Form */}
            {showTaskForm && (
              <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <h4 className="text-xs font-bold text-[#0E1A2B] uppercase">Create Workspace Task</h4>
                <form onSubmit={handleCreateTask} className="space-y-3">
                  <Input
                    label="Task Title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                    placeholder="e.g. Implement Oauth signup callbacks"
                    className="rounded-[4px] border-[#5B6472]/30"
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Detailed tasks expectations..."
                      className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border border-[#5B6472]/30 p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                        Priority
                      </label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-2 h-11 text-[#0E1A2B]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-3 h-11 text-[#0E1A2B] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                        Assignee
                      </label>
                      <select
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="w-full bg-[#F7F5EF]/50 border border-[#5B6472]/30 text-sm rounded-[4px] px-2 h-11 text-[#0E1A2B]"
                      >
                        <option value="">Unassigned</option>
                        {isContributor ? (
                          members.filter(m => String(m.id || m.user) === String(currentUserId)).map(m => (
                            <option key={m.id || m.email} value={m.id || m.user}>
                              {m.name || m.email} (Self)
                            </option>
                          ))
                        ) : (
                          members.map((m) => (
                            <option key={m.id || m.email} value={m.id || m.user}>
                              {m.name || m.email}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isCreatingTask}
                      className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                    >
                      Create Task
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTaskForm(false)}
                      className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Task list layout */}
            {tasks.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#5B6472] bg-white border border-dashed border-[#5B6472]/30 rounded-[8px]">
                No active tasks created for this project.
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const canMutate = checkCanMutateTask(task);
                  
                  return (
                    <Card
                      key={task._id}
                      className="p-4 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-[#0E1A2B]">{task.title}</h4>
                          <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-[4px] ${
                            task.priority === 'urgent' ? 'bg-[#B23A32]/10 text-[#B23A32]' :
                            task.priority === 'high' ? 'bg-[#C8862B]/10 text-[#C8862B]' :
                            'bg-[#5B6472]/15 text-[#5B6472]'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-[10px] text-[#5B6472] leading-relaxed">{task.description}</p>
                        )}
                        <div className="flex gap-4 text-[9px] font-mono text-[#5B6472] flex-wrap">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#5B6472]" /> Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#5B6472]" /> Mapped: {
                              members.find(m => String(m.id || m.user) === String(task.assignedTo?._id || task.assignedTo))?.name || 'Unassigned'
                            }
                          </span>
                          {task.milestone && (
                            <span className="flex items-center gap-1 text-[#0F6E5C] font-bold">
                              <Bookmark className="w-3 h-3" /> Milestone: {
                                milestones.find(ms => String(ms._id) === String(task.milestone?._id || task.milestone))?.title || 'Linked'
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status / Actions */}
                      <div className="flex items-center gap-3 self-start sm:self-center flex-wrap">
                        {/* Task Status LedgerStamp */}
                        <LedgerStamp status={task.status} date={task.updatedAt || task.createdAt} />

                        {canMutate ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                              className="bg-[#F7F5EF] border border-[#5B6472]/30 text-[10px] rounded-[4px] px-1.5 py-0.5 text-[#0E1A2B]"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="in_review">In Review</option>
                              <option value="done">Done</option>
                            </select>

                            {/* Milestone mapping dropdown */}
                            <select
                              value={task.milestone?._id || task.milestone || ''}
                              onChange={(e) => handleUpdateTaskMilestone(task._id, e.target.value)}
                              className="bg-[#F7F5EF] border border-[#5B6472]/30 text-[10px] rounded-[4px] px-1.5 py-0.5 text-[#0E1A2B]"
                            >
                              <option value="">No Milestone</option>
                              {milestones.map((ms) => (
                                <option key={ms._id} value={ms._id}>
                                  {ms.title}
                                </option>
                              ))}
                            </select>

                            {!isContributor && (
                              <select
                                value={task.assignedTo?._id || task.assignedTo || ''}
                                onChange={(e) => handleUpdateTaskAssignee(task._id, e.target.value)}
                                className="bg-[#F7F5EF] border border-[#5B6472]/30 text-[10px] rounded-[4px] px-1.5 py-0.5 text-[#0E1A2B]"
                              >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                  <option key={m.id || m.email} value={m.id || m.user}>
                                    {m.name || m.email}
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              onClick={() => handleArchiveTask(task._id)}
                              className="text-[#B23A32]/70 hover:text-[#B23A32] p-1.5 border border-[#B23A32]/25 rounded-[4px] transition-colors"
                              title="Archive Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[9px] text-[#5B6472] font-mono">
                            <AlertCircle className="w-3 h-3" /> Read Only
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-4 h-4 text-[#0F6E5C]" /> Project Documents ({documents.length})
              </h3>
              {!showDocForm && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowDocForm(true)}
                  className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Upload File</span>
                </Button>
              )}
            </div>

            {/* Document upload form */}
            {showDocForm && (
              <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <h4 className="text-xs font-bold text-[#0E1A2B] uppercase flex items-center gap-1">
                  <Upload className="w-4 h-4 text-[#0F6E5C]" /> Upload Document
                </h4>
                <form onSubmit={handleUploadDocument} className="space-y-3">
                  <Input
                    label="Document Title"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    required
                    placeholder="e.g. Carbon Credits Audit Report"
                    className="rounded-[4px] border-[#5B6472]/30"
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      placeholder="Brief description of the document..."
                      className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] placeholder:text-[#5B6472]/50 text-sm rounded-[4px] border border-[#5B6472]/30 p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      File Attachment (Max 20MB)
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setDocFile(e.target.files[0])}
                      required
                      className="w-full text-xs text-[#5B6472] file:mr-4 file:py-2 file:px-4 file:rounded-[4px] file:border-0 file:text-xs file:font-semibold file:bg-[#F7F5EF] file:text-[#0E1A2B] hover:file:bg-[#F7F5EF]/80 cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isUploadingDoc}
                      className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                    >
                      Upload File
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDocForm(false)}
                      className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Document metadata editing panel */}
            {editingDoc && (
              <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <h4 className="text-xs font-bold text-[#0E1A2B] uppercase">Edit Document Metadata</h4>
                <form onSubmit={handleUpdateDocMetadata} className="space-y-3">
                  <Input
                    label="Document Title"
                    value={editDocTitle}
                    onChange={(e) => setEditDocTitle(e.target.value)}
                    required
                    className="rounded-[4px] border-[#5B6472]/30"
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={editDocDescription}
                      onChange={(e) => setEditDocDescription(e.target.value)}
                      className="w-full bg-[#F7F5EF]/50 text-[#0E1A2B] text-sm rounded-[4px] border border-[#5B6472]/30 p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C] outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSavingDocMetadata}
                      className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingDoc(null)}
                      className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Documents List */}
            {documents.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#5B6472] bg-white border border-dashed border-[#5B6472]/30 rounded-[8px]">
                No active documents uploaded for this project.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => {
                  const canMutate = checkCanMutateDoc(doc);
                  
                  return (
                    <Card
                      key={doc._id}
                      className="p-4 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-[#0E1A2B] line-clamp-1">{doc.title}</h4>
                            <span className="text-[9px] font-mono text-[#5B6472] block line-clamp-1">{doc.fileName}</span>
                          </div>
                          {canMutate && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingDoc(doc);
                                  setEditDocTitle(doc.title);
                                  setEditDocDescription(doc.description || '');
                                }}
                                className="text-[#5B6472] hover:text-[#0E1A2B] p-1 transition-colors"
                                title="Edit Metadata"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleArchiveDocument(doc._id)}
                                className="text-[#B23A32]/70 hover:text-[#B23A32] p-1 transition-colors"
                                title="Archive Document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {doc.description && (
                          <p className="text-[10px] text-[#5B6472] leading-relaxed line-clamp-2">{doc.description}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#5B6472]/10 mt-3 flex items-center justify-between text-[9px] font-mono text-[#5B6472]">
                        <span>Size: {formatBytes(doc.fileSize)}</span>
                        {/* downloadUrl is local filesystem and not HTTP serveable in this phase */}
                        <span className="flex items-center gap-1 opacity-60 cursor-not-allowed" title="Download path not routed in this phase (local-disk default)">
                          <ExternalLink className="w-3 h-3" /> Download
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side info (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
            <h3 className="text-xs font-semibold text-[#0E1A2B] uppercase tracking-wider border-b border-[#5B6472]/10 pb-2">
              Context Details
            </h3>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#5B6472] flex items-center gap-1"><Folder className="w-3.5 h-3.5" /> Workspace</span>
                <span className="text-[#0E1A2B] font-bold">{workspace?.name || '—'}</span>
              </div>
              {startup && (
                <div className="flex justify-between items-center">
                  <span className="text-[#5B6472] flex items-center gap-1"><User className="w-3.5 h-3.5" /> Startup</span>
                  <span className="text-[#0E1A2B] font-bold">{startup.name}</span>
                </div>
              )}
              {project.createdAt && (
                <div className="flex justify-between items-center">
                  <span className="text-[#5B6472] flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date Created</span>
                  <span className="text-[#0E1A2B] font-bold">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
