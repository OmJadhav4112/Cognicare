import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Generic data-fetching hook.
 * Usage: const { data, loading, error, refetch } = useFetch('/patient/profile');
 */
export default function useFetch(url, options = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!url) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, options);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
