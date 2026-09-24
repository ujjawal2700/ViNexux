import React, { useState, useEffect, useMemo } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import {
  ChevronRight,
  Search,
  Layers,
  FolderTree,
  GitBranch,
  Info
} from 'lucide-react';
import CategoryIcon from '../../components/ui/CategoryIcon';

/**
 * Category Hierarchy Viewer (Read-Only)
 * Allows browsing: Header Category -> Main Category -> Sub Category
 */
const AdminCategoriesPage = () => {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active selections for the 3 columns
  const [selectedHeaderId, setSelectedHeaderId] = useState(null);
  const [selectedMainId, setSelectedMainId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);

  // Column search queries
  const [headerSearch, setHeaderSearch] = useState('');
  const [mainSearch, setMainSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCategories({
        limit: 500,
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      setAllCategories(res.data?.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.response?.data?.message || 'Failed to load category hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 1. Header Categories (root: parentId == null)
  const headerCategories = useMemo(() => {
    return allCategories.filter((c) => !c.parentId);
  }, [allCategories]);

  // Map of parentId -> children array
  const childrenMap = useMemo(() => {
    const map = new Map();
    for (const cat of allCategories) {
      const pId = cat.parentId?._id || cat.parentId;
      if (pId) {
        const key = String(pId);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(cat);
      }
    }
    return map;
  }, [allCategories]);

  // 2. Main Categories under selected Header
  const currentMainCategories = useMemo(() => {
    if (!selectedHeaderId) return [];
    return childrenMap.get(String(selectedHeaderId)) || [];
  }, [selectedHeaderId, childrenMap]);

  // 3. Sub Categories under selected Main
  const currentSubCategories = useMemo(() => {
    if (!selectedMainId) return [];
    return childrenMap.get(String(selectedMainId)) || [];
  }, [selectedMainId, childrenMap]);

  // Auto-select first items on initial load
  useEffect(() => {
    if (headerCategories.length > 0 && !selectedHeaderId) {
      const firstHeader = headerCategories[0];
      setSelectedHeaderId(firstHeader._id);

      const firstMains = childrenMap.get(String(firstHeader._id)) || [];
      if (firstMains.length > 0) {
        setSelectedMainId(firstMains[0]._id);
        const firstSubs = childrenMap.get(String(firstMains[0]._id)) || [];
        setSelectedSubId(firstSubs[0]?._id || null);
      } else {
        setSelectedMainId(null);
        setSelectedSubId(null);
      }
    }
  }, [headerCategories, childrenMap, selectedHeaderId]);

  // Active items objects
  const activeHeader = useMemo(
    () => headerCategories.find((c) => c._id === selectedHeaderId),
    [headerCategories, selectedHeaderId]
  );
  const activeMain = useMemo(
    () => currentMainCategories.find((c) => c._id === selectedMainId),
    [currentMainCategories, selectedMainId]
  );
  const activeSub = useMemo(
    () => currentSubCategories.find((c) => c._id === selectedSubId),
    [currentSubCategories, selectedSubId]
  );

  // Filtered lists
  const filteredHeaderCats = useMemo(() => {
    if (!headerSearch.trim()) return headerCategories;
    const q = headerSearch.toLowerCase();
    return headerCategories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [headerCategories, headerSearch]);

  const filteredMainCats = useMemo(() => {
    if (!mainSearch.trim()) return currentMainCategories;
    const q = mainSearch.toLowerCase();
    return currentMainCategories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [currentMainCategories, mainSearch]);

  const filteredSubCats = useMemo(() => {
    if (!subSearch.trim()) return currentSubCategories;
    const q = subSearch.toLowerCase();
    return currentSubCategories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [currentSubCategories, subSearch]);

  return (
    <div className="space-y-6">
      {/* Read-Only Header */}
      <AdminPageHeader
        title="Category Hierarchy Viewer"
        subtitle="Header Category → Main Category → Sub Category"
        badge={`${headerCategories.length} Header Categories • ${allCategories.length} Total`}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-96 rounded-xl bg-card border border-border" />
          <Skeleton className="h-96 rounded-xl bg-card border border-border" />
          <Skeleton className="h-96 rounded-xl bg-card border border-border" />
        </div>
      ) : error ? (
        <ErrorState title="Failed to load category hierarchy" message={error} onRetry={fetchCategories} />
      ) : (
        <div className="space-y-4">
          {/* Breadcrumb Flow Ribbon (Read-Only) */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-gray-600">
              <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Hierarchy Flow:</span>

              {/* 1. Header Category Indicator */}
              <div className="flex items-center gap-1.5 bg-rose-50 text-[#800020] border border-rose-200 px-2.5 py-1 rounded-md font-bold">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{activeHeader?.name || 'Select Header'}</span>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-400" />

              {/* 2. Main Category Indicator */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold border transition-colors ${
                  activeMain
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-400 border-gray-200 font-normal'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>{activeMain?.name || 'No Main Selected'}</span>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-400" />

              {/* 3. Sub Category Indicator */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold border transition-colors ${
                  activeSub
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-gray-100 text-gray-400 border-gray-200 font-normal'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>{activeSub?.name || 'No Sub Selected'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <Info className="w-3.5 h-3.5 text-gray-400" />
              <span>To add or edit categories, use the sidebar options: Header, Main, or Sub Category</span>
            </div>
          </div>

          {/* 3 READ-ONLY CASCADING CARDS SIDE BY SIDE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* ──────────────────────────────────────────────────────── */}
            {/* CARD 1: HEADER CATEGORY (Tier 1)                        */}
            {/* ──────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm flex flex-col overflow-hidden h-[620px]">
              {/* Card Header */}
              <div className="p-4 bg-gradient-to-r from-rose-50 to-white border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#800020] text-white text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <h3 className="font-extrabold text-sm text-gray-900 tracking-tight">Header Category</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Top-level root parent categories</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-[#800020]">
                  {headerCategories.length} Cats
                </span>
              </div>

              {/* Column Search */}
              <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter Header Categories..."
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Scrollable Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {filteredHeaderCats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No Header Categories match your search.
                  </div>
                ) : (
                  filteredHeaderCats.map((cat) => {
                    const isSelected = cat._id === selectedHeaderId;
                    const childCount = (childrenMap.get(String(cat._id)) || []).length;

                    return (
                      <div
                        key={cat._id}
                        onClick={() => {
                          setSelectedHeaderId(cat._id);
                          const mains = childrenMap.get(String(cat._id)) || [];
                          if (mains.length > 0) {
                            setSelectedMainId(mains[0]._id);
                            const subs = childrenMap.get(String(mains[0]._id)) || [];
                            setSelectedSubId(subs[0]?._id || null);
                          } else {
                            setSelectedMainId(null);
                            setSelectedSubId(null);
                          }
                        }}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-rose-50/90 border-[#800020] shadow-sm text-gray-900 font-bold'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <CategoryIcon name={cat.name} containerClassName="w-8 h-8 rounded-lg" className="w-4 h-4" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{cat.name}</span>
                              {!cat.isActive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-200 text-gray-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>#{cat.sortOrder || 0}</span>
                              <span>•</span>
                              <span className="text-[#800020] font-semibold">{childCount} Main Cats</span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-[#800020] translate-x-0.5' : 'text-gray-300'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ──────────────────────────────────────────────────────── */}
            {/* CARD 2: MAIN CATEGORY (Tier 2)                          */}
            {/* ──────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm flex flex-col overflow-hidden h-[620px]">
              {/* Card Header */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                      2
                    </span>
                    <h3 className="font-extrabold text-sm text-gray-900 tracking-tight">Main Category</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[200px]">
                    {activeHeader ? `Under "${activeHeader.name}"` : 'Select Header Category first'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {currentMainCategories.length} Cats
                </span>
              </div>

              {/* Column Search */}
              <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={activeHeader ? `Filter Main Cats of ${activeHeader.name}...` : 'Filter Main...'}
                    disabled={!activeHeader}
                    value={mainSearch}
                    onChange={(e) => setMainSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Scrollable Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {!activeHeader ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    Select a Header Category on the left to explore its Main Categories.
                  </div>
                ) : filteredMainCats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    <FolderTree className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-600">No Main Categories yet</p>
                    <p className="mt-1">Use the "Main Category" sidebar page to add categories under "{activeHeader.name}".</p>
                  </div>
                ) : (
                  filteredMainCats.map((cat) => {
                    const isSelected = cat._id === selectedMainId;
                    const subCount = (childrenMap.get(String(cat._id)) || []).length;

                    return (
                      <div
                        key={cat._id}
                        onClick={() => {
                          setSelectedMainId(cat._id);
                          const subs = childrenMap.get(String(cat._id)) || [];
                          setSelectedSubId(subs[0]?._id || null);
                        }}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 shadow-sm text-gray-900 font-bold'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <FolderTree className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{cat.name}</span>
                              {!cat.isActive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-200 text-gray-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>#{cat.sortOrder || 0}</span>
                              <span>•</span>
                              <span className="text-blue-700 font-semibold">{subCount} Subcats</span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-blue-600 translate-x-0.5' : 'text-gray-300'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ──────────────────────────────────────────────────────── */}
            {/* CARD 3: SUB CATEGORY (Tier 3)                           */}
            {/* ──────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm flex flex-col overflow-hidden h-[620px]">
              {/* Card Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-white border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">
                      3
                    </span>
                    <h3 className="font-extrabold text-sm text-gray-900 tracking-tight">Sub Category</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[200px]">
                    {activeMain ? `Under "${activeMain.name}"` : 'Select Main Category first'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentSubCategories.length} Cats
                </span>
              </div>

              {/* Column Search */}
              <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={activeMain ? `Filter Subcats of ${activeMain.name}...` : 'Filter Sub...'}
                    disabled={!activeMain}
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Scrollable Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {!activeMain ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    <FolderTree className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    Select a Main Category from the center card to explore its Sub Categories.
                  </div>
                ) : filteredSubCats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    <GitBranch className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-600">No Sub Categories</p>
                    <p className="mt-1 text-[11px]">
                      Sub category is optional. Products can be directly placed inside "{activeMain.name}".
                    </p>
                  </div>
                ) : (
                  filteredSubCats.map((cat) => {
                    const isSelected = cat._id === selectedSubId;

                    return (
                      <div
                        key={cat._id}
                        onClick={() => setSelectedSubId(cat._id)}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-50/90 border-emerald-500 shadow-sm text-gray-900 font-bold'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <GitBranch className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{cat.name}</span>
                              {!cat.isActive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-200 text-gray-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>#{cat.sortOrder || 0}</span>
                              <span>•</span>
                              <span className="text-gray-400 truncate">{cat.slug}</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesPage;
