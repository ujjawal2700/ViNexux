import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import productService from '../services/productService';

export default function useCatalogBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getBrands();
      setBrands(response.data?.brands || []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError('Unable to load brands. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { brands, loading, error, reload };
}
