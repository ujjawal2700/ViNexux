import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import contentService from '../../services/contentService';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Badge } from '../../components/ui/Badge';
import { Calendar, FileText, ArrowLeft } from 'lucide-react';

export const CmsPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await contentService.getCmsPageBySlug(slug);
        const pageData = res.data?.page || res.page || null;
        if (!pageData) {
          setError('Page not found');
        } else {
          setPage(pageData);
        }
      } catch (err) {
        console.error('CMS page fetch error:', err);
        setError('Page not found or unavailable.');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <div className="space-y-4 pt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ErrorState
          title="CMS Page Not Found"
          description={error || "The page you are looking for does not exist or has been unpublished."}
        />
        <div className="text-center mt-6">
          <Link to="/">
            <span className="text-xs font-semibold text-rose-400 hover:text-rose-300 inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="border-b border-border pb-6 space-y-4">
        <Link to="/" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          {page.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Last Updated: {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}
          </span>
          <Badge variant="primary" icon={<FileText className="w-3 h-3" />}>
            Official Page
          </Badge>
        </div>
      </div>

      {/* Content Renderer */}
      <article className="prose max-w-none text-[#664448] leading-relaxed text-sm space-y-4">
        {page.content ? (
          <div
            dangerouslySetInnerHTML={{ __html: page.content }}
            className="space-y-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-foreground [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
          />
        ) : (
          <p className="text-muted-foreground italic">No content provided for this page.</p>
        )}
      </article>
    </div>
  );
};

export default CmsPage;
