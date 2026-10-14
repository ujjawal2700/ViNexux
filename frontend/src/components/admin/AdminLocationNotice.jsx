import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { adminLocation } from '../../utils/adminLocation';

export default function AdminLocationNotice() {
  const [location, setLocation] = useState(adminLocation.get);
  useEffect(() => { const unsubscribe = adminLocation.subscribe(setLocation); return () => { unsubscribe(); adminLocation.stop(); }; }, []);
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
    <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-primary" />
      {location.status === 'available' ? `Audit location enabled · accuracy ±${Math.round(location.accuracy)} m` : `Audit location: ${location.status}. Changes are still recorded.`}
    </span>
    <span className="flex flex-wrap items-center gap-3"><span>Location is shared with the super admin when you save a change.</span>
      {location.status !== 'available' && <button type="button" className="font-semibold text-primary underline" onClick={() => adminLocation.start()}>Enable location</button>}</span>
  </div>;
}
