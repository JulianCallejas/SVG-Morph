import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ICON_PROVIDERS, type IconEntry } from '../utils/iconLibraries';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type Page } from '../utils/iconPaging';
import { prepareIconSvg } from '../utils/iconSvg';
import { Button } from './ui/Button';
import { Field, Select } from './ui/Fields';

interface IconLibraryDialogProps {
  onClose: () => void;
  onUse: (side: 'source' | 'target', svg: string) => Promise<void>;
}

const SEARCH_DELAY_MS = 250;

export const IconLibraryDialog: React.FC<IconLibraryDialogProps> = ({ onClose, onUse }) => {
  const [providerId, setProviderId] = useState(ICON_PROVIDERS[0].id);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState<Page<IconEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<IconEntry | null>(null);
  const [isUsing, setIsUsing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const provider = ICON_PROVIDERS.find((item) => item.id === providerId) ?? ICON_PROVIDERS[0];

  useEffect(() => {
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Typing waits a moment before it searches, and a new search starts from the first page
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchText);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    provider
      .list({ query, page, pageSize, signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setResult(next);
        if (next.page !== page) setPage(next.page);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Could not load the icons');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [provider, query, page, pageSize, retry]);

  const use = async (side: 'source' | 'target') => {
    if (!selected) return;
    const svg = prepareIconSvg(selected.svg);
    if (!svg) {
      setError('That icon could not be read as an SVG');
      return;
    }
    setIsUsing(true);
    try {
      await onUse(side, svg);
      onClose();
    } finally {
      setIsUsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="icon-library-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 sm:p-6">
          <h3 id="icon-library-title" className="text-xl font-medium">
            Icon library
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close icon library">
            <X size={20} />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-[1fr_2fr_1fr] sm:px-6">
          <Field label="Library">
            <Select
              value={providerId}
              onChange={(event) => {
                setProviderId(event.target.value);
                setPage(1);
                setSelected(null);
                setResult(null);
              }}
            >
              {ICON_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Search">
            <input
              ref={searchRef}
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="e.g. arrow, cloud rain"
              className="h-11 w-full bg-raised px-3 text-content"
            />
          </Field>
          <Field label="Per page">
            <Select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" aria-busy={isLoading}>
          {error ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-danger">{error}</p>
              <Button onClick={() => setRetry((count) => count + 1)}>Try again</Button>
            </div>
          ) : isLoading && !result ? (
            <p className="text-sm text-muted">Loading icons...</p>
          ) : result && result.total === 0 ? (
            <p className="text-sm text-muted">No icons match &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {result?.items.map((icon) => (
                <li key={icon.name}>
                  <button
                    type="button"
                    onClick={() => setSelected(icon)}
                    aria-label={icon.name}
                    aria-pressed={selected?.name === icon.name}
                    className={`flex h-full w-full flex-col items-center gap-2 p-3 text-content hover:bg-line/30 ${
                      selected?.name === icon.name ? 'bg-action/15 outline outline-2 outline-action' : 'bg-raised'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 items-center justify-center [&>svg]:h-8 [&>svg]:w-8"
                      dangerouslySetInnerHTML={{ __html: icon.svg }}
                    />
                    <span className="w-full truncate text-center text-xs text-muted" aria-hidden="true">
                      {icon.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-line p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Previous page"
              disabled={!result || result.page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={20} />
            </Button>
            <p className="text-center text-sm text-muted" aria-live="polite">
              {result ? `Page ${result.page} of ${result.pageCount} · ${result.total} icons` : ' '}
            </p>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Next page"
              disabled={!result || result.page >= result.pageCount || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight size={20} />
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {selected ? (
                <>
                  <span
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center bg-canvas text-content [&>svg]:h-12 [&>svg]:w-12"
                    dangerouslySetInnerHTML={{ __html: selected.svg }}
                  />
                  <p className="min-w-0 text-sm">
                    <span className="block truncate font-medium">{selected.name}</span>
                    <span className="text-muted">
                      {provider.label} · {provider.license} license
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">Pick an icon to preview it.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" disabled={!selected || isUsing} onClick={() => void use('source')}>
                Use as source
              </Button>
              <Button variant="primary" disabled={!selected || isUsing} onClick={() => void use('target')}>
                Use as target
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
