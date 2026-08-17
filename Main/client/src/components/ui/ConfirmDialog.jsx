import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmDialog = ({ open, onClose, onConfirm, title = 'Confirm action', children, confirmLabel = 'Confirm', isLoading = false }) => <Modal isOpen={open} onClose={onClose} title={title} maxWidth="max-w-md"><div className="grid gap-6"><p className="text-sm text-trust-slate">{children}</p><div className="flex justify-end gap-3"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button></div></div></Modal>;
