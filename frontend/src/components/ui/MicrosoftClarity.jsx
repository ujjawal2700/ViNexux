import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncMicrosoftClarity, commitMicrosoftClarityLocation } from '../../utils/microsoftClarity';
export default function MicrosoftClarity() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    const update = () => { syncMicrosoftClarity(); };
    window.addEventListener('storage-choices-updated', update);
    return () => window.removeEventListener('storage-choices-updated', update);
  }, []);
  useEffect(() => { commitMicrosoftClarityLocation(pathname + search + hash); }, [pathname, search, hash]);
  return null;
}
