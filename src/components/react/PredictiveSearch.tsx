// ============================================================
//  PredictiveSearch — header search trigger + instant-results
//  overlay. Debounced calls to /api/search; Enter goes to the
//  full /search page.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { formatMoney } from '~/lib/utils';
import { lockScroll, unlockScroll } from '~/lib/scroll-lock';
import { useFocusTrap } from './useFocusTrap';

interface PredictProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage?: { url: string; altText?: string | null } | null;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
}
interface PredictCollection {
  id: string;
  title: string;
  handle: string;
}
interface Results {
  products: PredictProduct[];
  collections: PredictCollection[];
  queries: { text: string }[];
}

const EMPTY: Results = { products: [], collections: [], queries: [] };

const TRENDING = [
  'Linen Blazer',
  'Resort Dresses',
  'Leather Tote',
  'Silk Scarves',
  'Wide-Leg Trousers',
];

export default function PredictiveSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Guard against out-of-order responses: a slower earlier request must never
    // overwrite the results of a newer query. Abort the in-flight fetch and
    // ignore its late resolution on every keystroke.
    let cancelled = false;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as Results;
        if (cancelled) return;
        setResults({
          products: data.products ?? [],
          collections: data.collections ?? [],
          queries: data.queries ?? [],
        });
      } catch {
        if (!cancelled) setResults(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, open]);

  // Body scroll lock + Esc + autofocus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-[43px] w-[43px] place-items-center rounded-sm text-text-primary transition-fluid hover:bg-surface-cool"
        aria-label="Search"
      >
        <Search size={20} strokeWidth={1.7} />
      </button>

      {open &&
        createPortal(
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Search">
          <div
            className="absolute inset-0 bg-bg-deep/35 backdrop-blur-[5px]"
            onClick={() => setOpen(false)}
          />

          {/* Floating search card — designer .search-panel */}
          <div
            ref={dialogRef}
            className="absolute left-1/2 top-[88px] w-[calc(100%-2rem)] max-w-[880px] -translate-x-1/2 rounded-lg bg-surface p-7 shadow-lg"
          >
            {/* Input row — designer .search-row (rounded-md, soft tint) */}
            <form
              onSubmit={submit}
              className="flex items-center gap-3.5 rounded-md bg-surface-cool py-1.5 pl-[22px] pr-1.5"
            >
              <Search size={23} strokeWidth={1.7} className="shrink-0 text-text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the collection…"
                className="w-full bg-transparent py-[15px] text-[17px] font-medium text-text-primary outline-none placeholder:font-normal placeholder:text-text-muted"
                aria-label="Search query"
              />
              {/* Close — solid dark rounded square (46×46) */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-sm bg-dark text-white transition-fluid hover:bg-dark-hover"
                aria-label="Close search"
              >
                <X size={19} strokeWidth={2} />
              </button>
            </form>

            {/* Trending — designer .search-sugg (tinted pills, coral hover) */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[1.5px] text-text-muted">
                Trending
              </span>
              {TRENDING.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setQuery(tag);
                    inputRef.current?.focus();
                  }}
                  className="rounded-pill bg-surface-cool px-4 py-[9px] text-[13px] font-semibold text-text-primary transition-colors hover:bg-coral hover:text-white"
                >
                  {tag}
                </button>
              ))}
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {query.trim().length < 1
                ? ''
                : loading
                  ? 'Searching'
                  : results.products.length + results.collections.length === 0
                    ? `No matches for ${query.trim()}`
                    : `${results.products.length} products and ${results.collections.length} collections found`}
            </p>

            {query.trim().length >= 1 && (
              <div className="mt-6 max-h-[55vh] overflow-y-auto border-t border-border pt-5">
                {loading && !results.products.length ? (
                  <p className="py-6 text-center text-sm text-text-muted">Searching…</p>
                ) : results.products.length === 0 && results.collections.length === 0 ? (
                  <p className="py-6 text-center text-sm text-text-muted">
                    No matches for “{query.trim()}”.
                  </p>
                ) : (
                <div className="flex flex-col gap-5">
                  {results.collections.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[1.8px] text-text-secondary">Collections</h3>
                      <div className="flex flex-wrap gap-2">
                        {results.collections.map((c) => (
                          <a
                            key={c.id}
                            href={`/collections/${c.handle}`}
                            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition-fluid hover:border-text-primary"
                          >
                            {c.title}
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {results.products.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[1.8px] text-text-secondary">Products</h3>
                      <ul className="flex flex-col">
                        {results.products.map((p) => (
                          <li key={p.id}>
                            <a
                              href={`/products/${p.handle}`}
                              className="flex items-center gap-3 rounded-md px-2 py-2 transition-fluid hover:bg-surface-cool"
                            >
                              <span className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface">
                                {p.featuredImage && (
                                  <img
                                    src={p.featuredImage.url}
                                    alt={p.featuredImage.altText ?? p.title}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                )}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                                {p.title}
                              </span>
                              <span className="font-mono text-sm tabular text-text-secondary">
                                {formatMoney(
                                  p.priceRange.minVariantPrice.amount,
                                  p.priceRange.minVariantPrice.currencyCode,
                                )}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
              </div>
            )}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
