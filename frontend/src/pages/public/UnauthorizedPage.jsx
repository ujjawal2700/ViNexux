import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const UnauthorizedPage = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fdf8f9] min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-[#f4e7ea] border border-[#e5d1d4] flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-[#be123c]" />
      </div>
      <h1 className="text-3xl font-extrabold text-[#3d0a0d] mb-2">Access Restricted</h1>
      <p className="text-xs text-[#7c5c5f] max-w-md mb-6 leading-relaxed">
        You do not possess the required permission tier or role clearance to access this protected area.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 bg-[#800020] hover:bg-[#66001a] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Storefront
      </Link>
    </div>
  );
};

export default UnauthorizedPage;
