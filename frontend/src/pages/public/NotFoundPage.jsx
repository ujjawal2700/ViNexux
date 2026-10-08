import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home, Search, SearchX } from 'lucide-react';

const NotFoundPage = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    if (query) navigate(`/search?search=${encodeURIComponent(query)}`);
  };

  return (
    <main className="flex min-h-[58vh] flex-1 items-center justify-center bg-slate-50 px-4 py-12 sm:py-16">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-[var(--store-surface)] px-6 py-10 text-center shadow-sm sm:px-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--store-primary)]/10 bg-[var(--store-primary)]/5 text-[var(--store-primary)]">
          <SearchX className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-bold tracking-[0.2em] text-[var(--store-primary)]">404</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">We couldn’t find that page</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
          The link may be outdated, or the page may have moved. Search our catalogue or choose a place to continue.
        </p>

        <form onSubmit={handleSearch} className="mx-auto mt-7 flex max-w-md gap-2">
          <label htmlFor="not-found-search" className="sr-only">Search products</label>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-[var(--store-primary)] focus-within:ring-2 focus-within:ring-[var(--store-primary)]/10">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              id="not-found-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, brands..."
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <button type="submit" className="rounded-lg bg-[var(--store-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--store-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--store-primary)] focus:ring-offset-2">
            Search
          </button>
        </form>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--store-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--store-primary-hover)]">
            <Home className="h-4 w-4" aria-hidden="true" /> Home
          </Link>
          <Link to="/brands" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
            Browse brands <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Go back
          </button>
        </div>
      </section>
    </main>
  );
};

export default NotFoundPage;
