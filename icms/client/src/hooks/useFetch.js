import { useState, useEffect } from 'react';
import api from '../api/axios';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    if (!url) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]); // ✅ ONLY url

  return { data, loading, error, refetch: fetchData };
}