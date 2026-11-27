import { useEffect, useState } from 'react';
import api from '../lib/api';

// Traveller earnings from completed deliveries (GET /users/me/earnings)
export function useEarnings(enabled = true) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    api.get('/users/me/earnings').then(r => setData(r.data)).catch(() => {});
  }, [enabled]);
  return data;
}
