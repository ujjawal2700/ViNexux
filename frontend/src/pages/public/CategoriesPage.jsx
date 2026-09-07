import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import categoryService from '../../services/categoryService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Image } from '../../components/ui/Image';
import { Layers, ArrowRight, Grid } from 'lucide-react';

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await categoryService.getCategories({ limit: 100, isActive: true });
      const list = res.data?.categories || res.categories || [];
      setCategories(list);
    } catch (err) {
      console.error('Categories page fetch error:', err);
      setError('Unable to load category hierarchy.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Group top-level categories vs subcategories if parentId present
  const parentCategories = categories.filter((cat) => !cat.parentId);
  const subCategories = categories.filter((cat) => Boolean(cat.parentId));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 bg-[#fdf8f9] text-[#3d0a0d] min-h-screen">
      {/* Header */}
      <div className="border-b border-[#e5d1d4] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">Security Equipment Classification</span>
        <h1 className="text-3xl font-extrabold text-[#3d0a0d] tracking-tight">Category Directory</h1>
        <p className="text-xs text-[#7c5c5f] mt-1">
          Explore specialized categories for CCTV cameras, network recorders, routers, wiring, and hardware.
        </p>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Category Fetch Error" description={error} onRetry={fetchCategories} />
      ) : categories.length > 0 ? (
        <div className="space-y-12">
          {/* Main Categories Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#3d0a0d] flex items-center gap-2 border-b border-[#e5d1d4] pb-2">
              <Layers className="w-5 h-5 text-[#800020]" />
              <span>Primary Equipment Categories</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {(parentCategories.length > 0 ? parentCategories : categories).map((cat) => (
                <Card
                  key={cat._id}
                  hoverable
                  className="h-full flex flex-col justify-between group bg-white border-[#e5d1d4] hover:border-[#800020] transition-all duration-300 shadow-sm"
                >
                  <div>
                    {/* Category Image if present */}
                    {cat.image ? (
                      <div className="overflow-hidden bg-[#f4e7ea]">
                        <Image src={cat.image} alt={cat.name} aspectRatio="aspect-video" />
                      </div>
                    ) : (
                      <div className="p-6 bg-[#f4e7ea] border-b border-[#e5d1d4] flex items-center justify-center text-[#800020]">
                        <Grid className="w-10 h-10 group-hover:scale-110 transition-transform" />
                      </div>
                    )}

                    <CardContent className="p-5 space-y-2">
                      <h3 className="font-bold text-[#3d0a0d] text-lg group-hover:text-[#800020] transition-colors">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-xs text-[#7c5c5f] line-clamp-3 leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                    </CardContent>
                  </div>

                  <CardFooter className="p-5 pt-0">
                    <Link to={`/products?categoryId=${cat._id}`} className="w-full">
                      <Button variant="outline" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                        Explore Products
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          {/* Subcategories Section (if present) */}
          {subCategories.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-[#e5d1d4]">
              <h2 className="text-xl font-bold text-[#3d0a0d] flex items-center gap-2 border-b border-[#e5d1d4] pb-2">
                <Grid className="w-5 h-5 text-[#800020]" />
                <span>Specialized Subcategories</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {subCategories.map((sub) => (
                  <Link
                    key={sub._id}
                    to={`/products?categoryId=${sub._id}`}
                    className="bg-white p-4 rounded-xl border border-[#e5d1d4] hover:border-[#800020] transition-all flex items-center justify-between group shadow-sm"
                  >
                    <div className="truncate">
                      <span className="font-bold text-xs text-[#3d0a0d] group-hover:text-[#800020] truncate block">
                        {sub.name}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9a6870] group-hover:text-[#800020] group-hover:translate-x-1 transition-transform shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No Categories Found"
          description="Categories have not been populated yet in the backend database."
        />
      )}
    </div>
  );
};

export default CategoriesPage;
