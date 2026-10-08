import useCatalogBrands from '../../hooks/useCatalogBrands';
import { ErrorState } from '../../components/ui/ErrorState';
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Store } from 'lucide-react';
import { buildBrandUrl } from '../../utils/categoryUrls';
import { BrandGridSkeleton } from '../../components/ui/Skeleton';

/**
 * Full catalogue of IT, CCTV, networking, and electronics brands
 * matching Mega Jaipur's brand directory and industry leaders.
 */


/**
 * Realistic Brand Logo Renderer using authentic brand colors, styling, and typography
 */
const BrandLogoDisplay = ({ brand }) => {
  const { name, color } = brand;
  if (brand.logo?.url) return <img loading="lazy" decoding="async" src={brand.logo.url} alt={name} className="max-h-16 max-w-full object-contain" />;

  // Custom visual styles for iconic brands
  switch (name) {
    case 'acer':
      return (
        <span className="text-xl sm:text-2xl font-bold tracking-tighter text-[#83b81a] lowercase font-sans">
          acer
        </span>
      );

    case 'ASUS':
      return (
        <div className="flex flex-col items-center">
          <span className="text-lg sm:text-xl font-black tracking-widest text-[#00539b] font-sans border-y-2 border-[#00539b] px-1 py-0.5">
            ASUS
          </span>
        </div>
      );

    case 'amazon':
      return (
        <div className="flex flex-col items-center leading-none">
          <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--store-text)] lowercase font-sans">
            amazon
          </span>
          <div className="w-9 h-1 border-b-2 border-[#ff9900] rounded-full -mt-0.5"></div>
        </div>
      );

    case 'AMD':
      return (
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-3.5 bg-[#ed1c24] rotate-45 shrink-0"></div>
          <span className="text-lg sm:text-xl font-black tracking-tight text-[var(--store-text)] font-mono">
            AMD
          </span>
        </div>
      );

    case 'Canon':
      return (
        <span className="text-lg sm:text-xl font-black tracking-tight text-[#cc0000] font-serif">
          Canon
        </span>
      );

    case 'SONY':
      return (
        <span className="text-lg sm:text-xl font-bold tracking-[0.2em] text-black font-serif">
          SONY
        </span>
      );

    case 'CISCO':
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-end gap-0.5 mb-0.5 h-3">
            <span className="w-0.5 h-1.5 bg-[#005073]"></span>
            <span className="w-0.5 h-2.5 bg-[#005073]"></span>
            <span className="w-0.5 h-3 bg-[#005073]"></span>
            <span className="w-0.5 h-2 bg-[#005073]"></span>
            <span className="w-0.5 h-1 bg-[#005073]"></span>
          </div>
          <span className="text-xs sm:text-sm font-black tracking-widest text-[#005073]">
            CISCO
          </span>
        </div>
      );

    case 'DELL':
      return (
        <div className="w-10 h-10 rounded-full border-2 border-[#007db8] flex items-center justify-center">
          <span className="text-xs font-black tracking-tighter text-[#007db8]">
            DELL
          </span>
        </div>
      );

    case 'HP':
      return (
        <div className="w-9 h-9 rounded-full bg-[#0096d6] flex items-center justify-center text-white italic font-bold text-sm">
          hp
        </div>
      );

    case 'INTEL':
      return (
        <div className="border border-[#0071c5] rounded-full px-2 py-0.5">
          <span className="text-xs sm:text-sm font-bold lowercase text-[#0071c5]">
            intel
          </span>
        </div>
      );

    case 'JBL':
      return (
        <div className="bg-[#ff3300] text-white px-2 py-1 rounded font-black text-xs tracking-wider flex items-center gap-0.5">
          <span>!</span>
          <span>JBL</span>
        </div>
      );

    case 'LENOVO':
      return (
        <div className="bg-[#e2231a] text-white px-2 py-0.5 font-bold text-xs tracking-tight">
          Lenovo
        </div>
      );

    case 'MICROSOFT':
      return (
        <div className="flex items-center gap-1.5">
          <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
            <span className="bg-[#f25022]"></span>
            <span className="bg-[#7fba00]"></span>
            <span className="bg-[#00a4ef]"></span>
            <span className="bg-[#ffb900]"></span>
          </div>
          <span className="text-xs font-semibold text-[var(--store-muted)]">Microsoft</span>
        </div>
      );

    case 'NIKON':
      return (
        <div className="bg-[#ffdc00] text-black px-2 py-1 font-black italic text-xs tracking-tight shadow-2xs">
          Nikon
        </div>
      );

    case 'CP PLUS':
      return (
        <span className="text-sm sm:text-base font-black tracking-tight text-[#c62828] uppercase">
          CP PLUS
        </span>
      );

    case 'HIKVISION':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wider text-[#d32f2f] uppercase">
          HIKVISION
        </span>
      );

    case 'tp-link':
      return (
        <div className="flex items-center gap-1 text-[#19b1aa]">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#19b1aa]"></span>
          <span className="text-xs sm:text-sm font-bold lowercase">tp-link</span>
        </div>
      );

    case 'brother':
      return (
        <span className="text-sm sm:text-base font-black tracking-tight text-[#004b93] lowercase">
          brother
        </span>
      );

    case 'BEETEL':
      return (
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-[#e60067] text-white flex items-center justify-center font-bold text-[10px]">
            b
          </span>
          <span className="text-xs font-black tracking-wider text-[var(--store-text)]">
            BEETEL
          </span>
        </div>
      );

    case 'BOSCH':
      return (
        <div className="flex flex-col items-center">
          <span className="text-sm sm:text-base font-black tracking-wider text-[#d9232d]">
            BOSCH
          </span>
        </div>
      );

    case 'BenQ':
      return (
        <span className="text-base sm:text-lg font-black tracking-tight text-[#502d7f]">
          BenQ
        </span>
      );

    case 'SAMSUNG':
      return (
        <span className="text-xs sm:text-sm font-black tracking-widest text-[#034ea2] uppercase">
          SAMSUNG
        </span>
      );

    case 'SEAGATE':
      return (
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full border-2 border-[#68bc45] border-t-transparent animate-spin-slow"></div>
          <span className="text-xs sm:text-sm font-bold tracking-tight text-[#68bc45]">
            SEAGATE
          </span>
        </div>
      );

    case 'Western Digital':
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-xs font-black text-[#005ca9] tracking-wider">
            Western
          </span>
          <span className="text-[10px] font-bold text-[#005ca9] -mt-0.5 tracking-wider">
            Digital
          </span>
        </div>
      );

    case 'D-Link':
      return (
        <span className="text-sm sm:text-base font-bold tracking-tight text-[#0099cc]">
          D-Link
        </span>
      );

    case 'UBIQUITI':
      return (
        <span className="text-xs sm:text-sm font-black tracking-widest text-[#0055ff] uppercase">
          UBIQUITI
        </span>
      );

    default:
      return (
        <span
          className="text-xs sm:text-sm font-black tracking-tight text-center truncate max-w-full"
          style={{ color: color || '#111827' }}
        >
          {name}
        </span>
      );
  }
};

/**
 * Exact Mega Jaipur "Shop By Brand" / All Brands Directory.
 * Features centered search bar and high-density responsive brand cards.
 */
export const BrandsPage = () => {
  const { brands, loading, error, reload } = useCatalogBrands();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter brands in real-time
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const q = searchQuery.toLowerCase().trim();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.tag && b.tag.toLowerCase().includes(q))
    );
  }, [searchQuery, brands]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
  };

  if (loading) return <BrandGridSkeleton />;
  if (error) return <ErrorState title="Brands unavailable" description={error} onRetry={reload} />;

  return (
    <div className="w-full min-h-screen bg-[var(--store-background)]/70 text-[var(--store-text)] pb-16">
      
      {/* Search Bar Container (Centered exactly like Mega Jaipur screenshot) */}
      <div className="w-full px-4 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div className="max-w-xl mx-auto">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--store-muted)]">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-11 sm:h-12 pl-10 sm:pl-11 pr-10 bg-[var(--store-surface)] border border-[var(--store-border)] rounded-lg text-sm text-[var(--store-text)] placeholder-gray-400 focus:outline-none focus:border-[var(--store-primary)] focus:ring-1 focus:ring-[var(--store-primary)] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--store-muted)] hover:text-[var(--store-muted)] cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="mt-2 text-xs text-[var(--store-muted)] text-left px-1 flex items-center justify-between">
              <span>
                Found <strong>{filteredBrands.length}</strong> brand{filteredBrands.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </span>
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="text-[var(--store-primary)] font-semibold hover:underline cursor-pointer"
              >
                Show all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Brands Grid (Wide Multi-Column Grid matching Mega Jaipur layout) */}
      <div className="storefront-container px-2 sm:px-4 lg:px-8">
        
        {filteredBrands.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[var(--store-surface)] rounded-xl border border-[var(--store-border)] max-w-lg mx-auto shadow-2xs space-y-4">
            <div className="w-14 h-14 rounded-full bg-[var(--store-background)] text-[var(--store-muted)] mx-auto flex items-center justify-center">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--store-text)]">
                No brands found
              </h3>
              <p className="text-xs text-[var(--store-muted)] mt-1">
                We couldn't find any brands matching "{searchQuery}".
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="px-4 py-2 bg-[var(--store-primary)] hover:bg-[#9a1b32] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5 sm:gap-3.5">
              {filteredBrands.map((brand) => (
                <Link
                  key={brand._id || brand.slug || brand.name}
                  to={buildBrandUrl(brand)}
                  className="relative group bg-[var(--store-surface)] border border-[var(--store-border)]/90 hover:border-[var(--store-primary)] rounded-lg p-2 sm:p-3 flex items-center justify-center aspect-square shadow-2xs hover:shadow-md transition-all duration-200 select-none cursor-pointer"
                >
                  {/* Brand Visual Logo Representation */}
                  <div className="flex items-center justify-center w-full h-full text-center px-1 transition-transform duration-200 group-hover:scale-105">
                    <BrandLogoDisplay brand={brand} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default BrandsPage;
