import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center bg-white min-h-[60vh]">
      {/* Icon Badge */}
      <div className="w-14 h-14 rounded-2xl bg-[#faf5fb] border border-[#f0e4f3] flex items-center justify-center mb-5 text-[#800020]">
        <SearchX className="w-7 h-7 stroke-[1.8]" />
      </div>

      {/* Heading */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2.5 tracking-tight">
        Page not found
      </h1>

      {/* Description */}
      <p className="text-sm sm:text-base text-gray-500 max-w-md mb-8 leading-relaxed">
        The page you're looking for doesn't exist or has been moved. Try one of these instead.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3.5">
        <Link
          to="/"
          className="px-7 py-2.5 rounded-full bg-[#800020] hover:bg-[#660019] text-white text-sm font-semibold transition-all shadow-xs active:scale-98"
        >
          Continue Shopping
        </Link>
        <Link
          to="/brands"
          className="px-6 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold transition-all active:scale-98"
        >
          All brands
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
