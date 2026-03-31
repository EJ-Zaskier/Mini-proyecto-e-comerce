import { useCallback, useEffect, useState } from 'react';

const DEFAULT_TIMEOUT = 4200;

const useToast = (timeout = DEFAULT_TIMEOUT) => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), timeout);
    return () => window.clearTimeout(timer);
  }, [toast, timeout]);

  const showToast = useCallback((type, message) => {
    const normalized = String(message || '').trim();
    if (!normalized) return;
    setToast({ id: Date.now(), type, message: normalized });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    hideToast
  };
};

export default useToast;
