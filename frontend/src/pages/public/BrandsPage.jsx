import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { buildBrandUrl } from '../../utils/categoryUrls';
import Pagination from '../../components/ui/Pagination';

/**
 * Full catalogue of IT, CCTV, networking, and electronics brands
 * matching Mega Jaipur's brand directory and industry leaders.
 */
export const ALL_BRANDS = [
  { name: 'PRAMA', logoText: 'PRAMA', color: '#005baa', tag: 'CCTV' },
  { name: 'AARVEX', logoText: 'AARVEX', color: '#2d3748', tag: 'Storage' },
  { name: 'acer', logoText: 'acer', color: '#83b81a', tag: 'Laptops' },
  { name: 'ADATA', logoText: 'ADATA', color: '#0054a6', tag: 'Memory' },
  { name: 'AOYi', logoText: 'AOYi', color: '#0083ca', tag: 'Security' },
  { name: 'Alite', logoText: 'Alite', color: '#c52026', tag: 'GPS' },
  { name: 'amazon', logoText: 'amazon', color: '#ff9900', tag: 'Smart Devices' },
  { name: 'AMD', logoText: 'AMD', color: '#ed1c24', tag: 'Processors' },
  { name: 'ANT ESPORTS', logoText: 'ANT ESPORTS', color: '#111111', tag: 'Gaming' },
  { name: 'ANT VALUE', logoText: 'ANT VALUE', color: '#111111', tag: 'Peripherals' },
  { name: 'APC', logoText: 'APC', color: '#ed1c24', tag: 'Power UPS' },
  { name: 'A+ PRODUCTS', logoText: 'A+ PRODUCTS', color: '#003399', tag: 'Accessories' },
  { name: 'ASRock', logoText: 'ASRock', color: '#689f38', tag: 'Motherboards' },
  { name: 'ASUS', logoText: 'ASUS', color: '#00539b', tag: 'Laptops' },
  { name: 'B&B', logoText: 'B&B', color: '#555555', tag: 'Racks' },
  { name: 'BEETEL', logoText: 'BEETEL', color: '#e60067', tag: 'Telecom' },
  { name: 'BenQ', logoText: 'BenQ', color: '#502d7f', tag: 'Monitors' },
  { name: 'BESTOR', logoText: 'BESTOR', color: '#b8860b', tag: 'Cables' },
  { name: 'BIOSTAR', logoText: 'BIOSTAR', color: '#e50914', tag: 'Components' },
  { name: 'BOSCH', logoText: 'BOSCH', color: '#d9232d', tag: 'Security' },
  { name: 'BRANDED', logoText: 'BRANDED', color: '#111111', tag: 'Hardware' },
  { name: 'brother', logoText: 'brother', color: '#004b93', tag: 'Printers' },
  { name: 'cablet', logoText: 'cablet', color: '#00a3e0', tag: 'Networking' },
  { name: 'Canon', logoText: 'Canon', color: '#cc0000', tag: 'Printers & Cameras' },
  { name: 'CASIO', logoText: 'CASIO', color: '#00509d', tag: 'Calculators' },
  { name: 'CATVISION', logoText: 'CATVISION', color: '#7a1c7a', tag: 'Cables' },
  { name: 'CP PLUS', logoText: 'CP PLUS', color: '#c62828', tag: 'CCTV' },
  { name: 'CISCO', logoText: 'CISCO', color: '#005073', tag: 'Networking' },
  { name: 'CORSAIR', logoText: 'CORSAIR', color: '#facc15', tag: 'Gaming' },
  { name: 'DAHUA', logoText: 'DAHUA', color: '#d9232d', tag: 'CCTV' },
  { name: 'DELL', logoText: 'DELL', color: '#007db8', tag: 'Computers' },
  { name: 'DIGITEK', logoText: 'DIGITEK', color: '#ff6600', tag: 'Cameras' },
  { name: 'D-Link', logoText: 'D-Link', color: '#0099cc', tag: 'Networking' },
  { name: 'EPSON', logoText: 'EPSON', color: '#003399', tag: 'Printers' },
  { name: 'EVM', logoText: 'EVM', color: '#e60000', tag: 'Storage' },
  { name: 'FINGERS', logoText: 'FINGERS', color: '#ff4500', tag: 'Accessories' },
  { name: 'FRONTECH', logoText: 'FRONTECH', color: '#0055a5', tag: 'Peripherals' },
  { name: 'GIGABYTE', logoText: 'GIGABYTE', color: '#ff6600', tag: 'Hardware' },
  { name: 'HIKVISION', logoText: 'HIKVISION', color: '#d32f2f', tag: 'CCTV' },
  { name: 'HONEYWELL', logoText: 'HONEYWELL', color: '#ea2227', tag: 'Security' },
  { name: 'HP', logoText: 'HP', color: '#0096d6', tag: 'Laptops & Printers' },
  { name: 'INTEL', logoText: 'INTEL', color: '#0071c5', tag: 'Processors' },
  { name: 'JBL', logoText: 'JBL', color: '#ff3300', tag: 'Audio' },
  { name: 'KINGSTON', logoText: 'KINGSTON', color: '#c8102e', tag: 'Storage' },
  { name: 'KODAK', logoText: 'KODAK', color: '#e4002b', tag: 'Cameras' },
  { name: 'LENOVO', logoText: 'LENOVO', color: '#e2231a', tag: 'Laptops' },
  { name: 'LOGITECH', logoText: 'LOGITECH', color: '#00b8fc', tag: 'Peripherals' },
  { name: 'MICROSOFT', logoText: 'MICROSOFT', color: '#00a4ef', tag: 'Software' },
  { name: 'MSI', logoText: 'MSI', color: '#ed1c24', tag: 'Gaming' },
  { name: 'NETGEAR', logoText: 'NETGEAR', color: '#333333', tag: 'Routers' },
  { name: 'NIKON', logoText: 'NIKON', color: '#ffdc00', tag: 'Cameras' },
  { name: 'PANASONIC', logoText: 'PANASONIC', color: '#004098', tag: 'Electronics' },
  { name: 'PNY', logoText: 'PNY', color: '#111111', tag: 'Graphics' },
  { name: 'QUICK HEAL', logoText: 'QUICK HEAL', color: '#ea1d24', tag: 'Antivirus' },
  { name: 'REALME', logoText: 'REALME', color: '#ffc915', tag: 'Smart Devices' },
  { name: 'SAMSUNG', logoText: 'SAMSUNG', color: '#034ea2', tag: 'Displays & SSD' },
  { name: 'SANDISK', logoText: 'SANDISK', color: '#e31837', tag: 'Storage' },
  { name: 'SEAGATE', logoText: 'SEAGATE', color: '#68bc45', tag: 'Hard Drives' },
  { name: 'SONY', logoText: 'SONY', color: '#000000', tag: 'Cameras & Audio' },
  { name: 'TOSHIBA', logoText: 'TOSHIBA', color: '#e50012', tag: 'Storage' },
  { name: 'TOTOLINK', logoText: 'TOTOLINK', color: '#0077c8', tag: 'Networking' },
  { name: 'TP-LINK', logoText: 'tp-link', color: '#19b1aa', tag: 'Networking' },
  { name: 'TRUEVIEW', logoText: 'Trueview', color: '#e11d48', tag: 'CCTV' },
  { name: 'TVS', logoText: 'TVS', color: '#003399', tag: 'POS & Billing' },
  { name: 'UBIQUITI', logoText: 'UBIQUITI', color: '#0055ff', tag: 'Enterprise WiFi' },
  { name: 'VIEWSONIC', logoText: 'ViewSonic', color: '#b91c1c', tag: 'Monitors' },
  { name: 'WESTERN DIGITAL', logoText: 'Western Digital', color: '#005ca9', tag: 'Storage' },
  { name: 'XIAOMI', logoText: 'Xiaomi', color: '#ff6900', tag: 'Smart Tech' },
  { name: 'ZEBRONICS', logoText: 'ZEBRONICS', color: '#1a1a1a', tag: 'Peripherals' },
  { name: 'ZOTAC', logoText: 'ZOTAC', color: '#ff6200', tag: 'Graphics Cards' },
];

/**
 * Realistic Brand Logo Renderer using authentic brand colors, styling, and typography
 */
const BrandLogoDisplay = ({ brand }) => {
  const { name, color } = brand;

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
          <span className="text-base sm:text-lg font-bold tracking-tight text-gray-900 lowercase font-sans">
            amazon
          </span>
          <div className="w-9 h-1 border-b-2 border-[#ff9900] rounded-full -mt-0.5"></div>
        </div>
      );

    case 'AMD':
      return (
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-3.5 bg-[#ed1c24] rotate-45 shrink-0"></div>
          <span className="text-lg sm:text-xl font-black tracking-tight text-gray-900 font-mono">
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
          <span className="text-xs font-semibold text-gray-700">Microsoft</span>
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
          <span className="text-xs font-black tracking-wider text-gray-900">
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 32;

  // Filter brands in real-time
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return ALL_BRANDS;
    const q = searchQuery.toLowerCase().trim();
    return ALL_BRANDS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.tag && b.tag.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage) || 1;

  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBrands.slice(start, start + itemsPerPage);
  }, [filteredBrands, currentPage, itemsPerPage]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/70 text-gray-900 pb-16">
      
      {/* Search Bar Container (Centered exactly like Mega Jaipur screenshot) */}
      <div className="w-full px-4 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div className="max-w-xl mx-auto">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-11 sm:h-12 pl-10 sm:pl-11 pr-10 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="mt-2 text-xs text-gray-500 text-left px-1 flex items-center justify-between">
              <span>
                Found <strong>{filteredBrands.length}</strong> brand{filteredBrands.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </span>
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="text-[#800020] font-semibold hover:underline cursor-pointer"
              >
                Show all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Brands Grid (Wide Multi-Column Grid matching Mega Jaipur layout) */}
      <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-8">
        
        {filteredBrands.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-xl border border-gray-200 max-w-lg mx-auto shadow-2xs space-y-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">
                No brands found
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                We couldn't find any brands matching "{searchQuery}".
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="px-4 py-2 bg-[#800020] hover:bg-[#9a1b32] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2.5 sm:gap-3.5">
              {paginatedBrands.map((brand) => (
                <Link
                  key={brand.name}
                  to={buildBrandUrl(brand.name)}
                  className="relative group bg-white border border-gray-200/90 hover:border-[#800020] rounded-lg p-2 sm:p-3 flex items-center justify-center aspect-square shadow-2xs hover:shadow-md transition-all duration-200 select-none cursor-pointer"
                  title={`View ${brand.name} products`}
                >
                  {/* Brand Visual Logo Representation */}
                  <div className="flex items-center justify-center w-full h-full text-center px-1 transition-transform duration-200 group-hover:scale-105">
                    <BrandLogoDisplay brand={brand} />
                  </div>

                  {/* Dark Hover Tooltip Badge on bottom edge matching Mega Jaipur */}
                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#111111] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 uppercase tracking-wider pointer-events-none whitespace-nowrap">
                    {brand.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            {filteredBrands.length > itemsPerPage && (
              <div className="mt-8 pt-4 border-t border-gray-200 bg-white rounded-lg px-4 py-2 shadow-2xs">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredBrands.length}
                  pageSize={itemsPerPage}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default BrandsPage;
