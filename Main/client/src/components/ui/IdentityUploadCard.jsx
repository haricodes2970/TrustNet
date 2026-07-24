import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileText, Trash2, Link2 } from 'lucide-react';

export const IdentityUploadCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  onFileSelect, 
  allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'], 
  maxSizeMB = 5,
  isUrlInput = false,
  urlValue = '',
  onUrlChange,
  placeholder = 'https://example.com'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const processFile = (selectedFile) => {
    if (!selectedFile) return;

    // Validate File Type
    const fileType = selectedFile.type;
    const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
    
    const isAllowedType = allowedTypes.includes(fileType) || 
      allowedTypes.some(type => type.startsWith('.') && fileExtension === type.toLowerCase());

    if (allowedTypes.length > 0 && !isAllowedType) {
      setStatus('error');
      setErrorMessage(`Invalid file format. Supported: JPEG, PNG, PDF.`);
      onFileSelect?.(null);
      return;
    }

    // Validate File Size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      setStatus('error');
      setErrorMessage(`File is too large. Max limit is ${maxSizeMB}MB.`);
      onFileSelect?.(null);
      return;
    }

    // Process valid file
    setFile(selectedFile);
    setStatus('uploading');
    setErrorMessage('');
    setProgress(0);

    // Simulate upload progress
    const duration = 1200; // 1.2s total duration
    const intervalTime = 100;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          clearInterval(timer);
          setStatus('success');
          onFileSelect?.(selectedFile);
          return 100;
        }
        return Math.min(oldProgress + step, 100);
      });
    }, intervalTime);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onButtonClick();
    }
  };

  const resetFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileSelect?.(null);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Check if URL looks valid
  const isValidUrl = urlValue && (urlValue.startsWith('http://') || urlValue.startsWith('https://'));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between h-80 transition-all shadow-soft-sm hover:shadow-soft-md">
      
      {/* Header section with icon, title, and subtitle */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{subtitle}</p>
        </div>
      </div>

      {/* Conditional rendering for URL Input vs. File Upload Dropzone */}
      {isUrlInput ? (
        <div className="flex-1 flex flex-col justify-center p-2">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => onUrlChange?.(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl pl-10 pr-4 py-3 h-11 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              />
            </div>
            
            {/* Status messages for URL input */}
            {isValidUrl ? (
              <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-50/50 dark:bg-emerald-950/10 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Link correctly formatted & saved.</span>
              </div>
            ) : urlValue ? (
              <div className="flex items-center gap-2 text-[10px] text-amber-600 font-medium bg-amber-50/30 dark:bg-amber-950/10 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>URL should begin with http:// or https://</span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 leading-normal">
                Paste your official web address directly above to authenticate profile sync features.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Large upload area occupying most of the card */
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Upload zone for ${title}`}
          className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all select-none ${
            dragActive 
              ? 'border-emerald-500 bg-emerald-50/20' 
              : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-emerald-500/40'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            onChange={handleInputChange}
            accept={allowedTypes.join(',')}
          />

          {status === 'idle' && (
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Drag & drop or click to upload</p>
              <p className="text-[10px] text-slate-400">PDF, PNG, JPG up to {maxSizeMB}MB</p>
            </div>
          )}

          {status === 'uploading' && (
            <div className="w-full text-center space-y-3 px-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                <span className="truncate max-w-[150px]">{file?.name}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-100" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">Uploading credibility file...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="w-full flex items-center justify-between p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl relative group"
                 onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div className="truncate text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{file?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{formatBytes(file?.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <button 
                  onClick={resetFile}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  title="Remove file"
                  aria-label="Remove uploaded file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-2.5 px-3"
                 onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-10 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Upload Failed</p>
              <p className="text-[10px] text-red-600 dark:text-red-400 leading-normal">{errorMessage}</p>
              <button 
                onClick={resetFile}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
