'use client';

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const toasts: Toast[] = [];
const listeners: Set<(toasts: Toast[]) => void> = new Set();

let toastIdCounter = 0;

function notifyListeners() {
  listeners.forEach(listener => listener([...toasts]));
}

function removeToast(id: string) {
  const index = toasts.findIndex(toast => toast.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    notifyListeners();
  }
}

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = `toast-${++toastIdCounter}`;
  const newToast: Toast = { ...toast, id };
  
    toasts.push(newToast);
  notifyListeners();

  // Auto-remove after duration
  setTimeout(() => {
    removeToast(id);
  }, toast.duration || 3000);

  return id;
}

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>([...toasts]);

  const updateToasts = useCallback((newToasts: Toast[]) => {
    setToastList(newToasts);
  }, []);

  // Subscribe to toast updates
  useEffect(() => {
    listeners.add(updateToasts);
    return () => {
      listeners.delete(updateToasts);
    };
  }, [updateToasts]);

  const toast = useCallback((toast: Omit<Toast, 'id'>) => {
    return addToast(toast);
  }, []);

  return {
    toasts: toastList,
    toast,
    removeToast
  };
}