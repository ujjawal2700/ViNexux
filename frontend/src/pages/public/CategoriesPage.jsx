import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import categoryService from '../../services/categoryService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { ArrowRight, Grid, Layers } from 'lucide-react';
import CategoryIcon, { getCategoryProductImage } from '../../components/ui/CategoryIcon';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Security Equipment Classification</span>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Category Directory</h1>
        <p className="text-xs text-muted-foreground mt-1">
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
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Layers className="w-5 h-5 text-primary" />
              <span>Primary Equipment Categories</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {(parentCategories.length > 0 ? parentCategories : categories).map((cat) => (
                <Card
                  key={cat._id}
                  hoverable
                  className="h-full flex flex-col justify-between group bg-card border-border hover:border-primary/50 transition-all duration-300 shadow-sm p-4 sm:p-5 space-y-4 overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Header Row with Colorful Icon & Badge */}
                    <div className="flex items-center justify-between">
                      <CategoryIcon name={cat.name} containerClassName="w-11 h-11" className="w-5.5 h-5.5" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        Catalog
                      </span>
                    </div>

                    {/* Category Product Photo Preview Frame */}
                    <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-muted/40 border border-border/60 group-hover:border-primary/40 transition-colors">
                      <img
                        src={getCategoryProductImage(cat.name, cat.image)}
                        alt={cat.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1 font-medium">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <Link to={`/products?categoryId=${cat._id}`} className="w-full">
                      <Button variant="outline" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                        Browse Products
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Subcategories Section (if present) */}
          {subCategories.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Grid className="w-5 h-5 text-primary" />
                <span>Specialized Subcategories</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subCategories.map((sub) => (
                  <Link
                    key={sub._id}
                    to={`/products?categoryId=${sub._id}`}
                    className="bg-card p-3 rounded-2xl border border-border hover:border-primary/50 transition-all flex items-center justify-between group shadow-xs gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Subcategory Small Product Thumbnail */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-border bg-muted/40 relative">
                        <img
                          src={getCategoryProductImage(sub.name, sub.image)}
                          alt={sub.name}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>

                      <div className="truncate">
                        <span className="font-bold text-xs text-foreground group-hover:text-primary truncate block leading-tight">
                          {sub.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate block font-medium mt-0.5">
                          Explore Sub-Catalog
                        </span>
                      </div>
                    </div>
                    
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform shrink-0" />
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
