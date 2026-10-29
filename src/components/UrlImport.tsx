import React, { useState } from 'react';
import { importSvgFromUrl } from '../utils/importSvgFromUrl';
import { Button } from './ui/Button';

interface UrlImportProps {
  label: string;
  onImport: (content: string) => Promise<void>;
}

export const UrlImport: React.FC<UrlImportProps> = ({ label, onImport }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onImport(await importSvgFromUrl(url));
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that SVG');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={`${label}-url`}>
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`${label}-url`}
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/icon.svg"
          className="h-11 min-w-0 flex-1 bg-raised px-3 text-content"
          aria-describedby={error ? `${label}-url-error` : undefined}
        />
        <Button type="submit" disabled={isLoading || !url.trim()}>
          {isLoading ? 'Importing...' : 'Import'}
        </Button>
      </div>
      {error && (
        <p id={`${label}-url-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
};
