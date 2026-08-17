import React from 'react';

export const FileUpload = ({ label = 'Upload a file', accept, onChange, error }) => <label className="grid cursor-pointer gap-2 rounded-lg border border-dashed border-trust-ink/35 bg-white p-4 text-sm text-trust-ink focus-within:ring-2 focus-within:ring-trust-verified"><span className="font-semibold">{label}</span><input className="text-xs" type="file" accept={accept} onChange={onChange} />{error && <span className="text-xs text-trust-alert">{error}</span>}</label>;
