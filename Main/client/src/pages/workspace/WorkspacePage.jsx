import React, { useState } from 'react';
import { Plus, CheckCircle2, User, Clock, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';

export const WorkspacePage = () => {
  const { showToast } = useApp();

  const [columns, setColumns] = useState({
    backlog: [
      { id: 't1', title: 'Design Glassmorphic Auth Templates', tag: 'UI/UX', priority: 'High' },
      { id: 't2', title: 'Setup Stripe Subscription Billing API', tag: 'Backend', priority: 'Medium' }
    ],
    inProgress: [
      { id: 't3', title: 'Build React + Vite Frontend Components', tag: 'Frontend', priority: 'Urgent' },
      { id: 't4', title: 'Implement Recharts Analytics Graphs', tag: 'Analytics', priority: 'Medium' }
    ],
    review: [
      { id: 't5', title: 'Pitch Deck PDF Viewer Component', tag: 'Feature', priority: 'High' }
    ],
    done: [
      { id: 't6', title: 'Project Initialization & Design System', tag: 'Core', priority: 'Low' }
    ]
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('Frontend');

  const moveTask = (taskId, sourceCol, destCol) => {
    const task = columns[sourceCol].find(t => t.id === taskId);
    if (!task) return;

    setColumns(prev => ({
      ...prev,
      [sourceCol]: prev[sourceCol].filter(t => t.id !== taskId),
      [destCol]: [...prev[destCol], task]
    }));
    showToast('Task Status Updated', `Moved task to ${destCol.toUpperCase()}`, 'info');
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask = {
      id: `t_${Date.now()}`,
      title: newTitle,
      tag: newTag,
      priority: 'Medium'
    };

    setColumns(prev => ({ ...prev, backlog: [...prev.backlog, newTask] }));
    setIsTaskModalOpen(false);
    setNewTitle('');
    showToast('Task Created', 'Added new item to Backlog.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Collaboration Workspace (Kanban)</h1>
          <p className="text-xs text-slate-500 mt-1">Manage startup sprint tasks, members, and shared files</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsTaskModalOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 overflow-x-auto pb-4">
        {/* Backlog */}
        <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/80 space-y-3 min-h-[420px]">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span>Backlog ({columns.backlog.length})</span>
          </div>
          {columns.backlog.map(task => (
            <Card key={task.id} className="p-3.5 border-slate-200 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <Badge variant="slate" size="sm">{task.tag}</Badge>
                <button onClick={() => moveTask(task.id, 'backlog', 'inProgress')} className="text-[10px] text-emerald-600 font-bold hover:underline">
                  Move to In Progress →
                </button>
              </div>
              <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
            </Card>
          ))}
        </div>

        {/* In Progress */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3 min-h-[420px]">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <span>In Progress ({columns.inProgress.length})</span>
          </div>
          {columns.inProgress.map(task => (
            <Card key={task.id} className="p-3.5 border-emerald-200 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <Badge variant="emerald" size="sm">{task.tag}</Badge>
                <button onClick={() => moveTask(task.id, 'inProgress', 'review')} className="text-[10px] text-emerald-600 font-bold hover:underline">
                  Move to Review →
                </button>
              </div>
              <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
            </Card>
          ))}
        </div>

        {/* Review */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3 min-h-[420px]">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
            <span>Review ({columns.review.length})</span>
          </div>
          {columns.review.map(task => (
            <Card key={task.id} className="p-3.5 border-amber-200 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <Badge variant="amber" size="sm">{task.tag}</Badge>
                <button onClick={() => moveTask(task.id, 'review', 'done')} className="text-[10px] text-emerald-600 font-bold hover:underline">
                  Mark Done ✓
                </button>
              </div>
              <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
            </Card>
          ))}
        </div>

        {/* Done */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 min-h-[420px]">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Completed ({columns.done.length})</span>
          </div>
          {columns.done.map(task => (
            <Card key={task.id} className="p-3.5 border-slate-200 space-y-2 bg-white/70">
              <Badge variant="slate" size="sm">{task.tag}</Badge>
              <h4 className="text-xs font-bold text-slate-500 line-through">{task.title}</h4>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add New Sprint Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <input
            type="text"
            placeholder="Task Title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3"
            required
          />
          <Button type="submit" variant="primary" className="w-full">
            Create Task
          </Button>
        </form>
      </Modal>
    </div>
  );
};
