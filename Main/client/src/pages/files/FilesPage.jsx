import React from 'react';
import { Folder, FileText, Image, Download, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';

export const FilesPage = () => {
  const { files, showToast } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Startup File Manager</h1>
          <p className="text-xs text-slate-500 mt-1">Manage pitch decks, brand kits, cap tables, and verified certificates</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => showToast('File Uploaded', 'Added file to vault.', 'success')}>
          Upload File
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {files.map(f => (
          <Card key={f.id} className="p-4 border-slate-200 space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 truncate">{f.name}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{f.size} • {f.date}</p>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => showToast('Download Started', `Downloading ${f.name}...`, 'info')}>
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
