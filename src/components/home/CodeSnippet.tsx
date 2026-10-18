import React, { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '../../utils/copyToClipboard';

type CopyState = 'idle' | 'copied' | 'failed';

interface CodeSnippetProps {
  label: string;
  code: string;
  className?: string;
}

const COPY_LABEL: Record<CopyState, string> = {
  idle: 'Copy',
  copied: 'Copied',
  failed: 'Copy failed',
};

// A preview of an example: long lines end in an ellipsis instead of scrolling,
// while the Copy button always puts the complete code on the clipboard.
export const CodeSnippet: React.FC<CodeSnippetProps> = ({ label, code, className = '' }) => {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const copied = await copyToClipboard(code);
    setState(copied ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="h-11 min-w-24 bg-raised px-4 text-sm font-medium text-content hover:bg-line/40"
        >
          {COPY_LABEL[state]}
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-hidden bg-canvas p-4 text-sm leading-relaxed text-content">
        <code>
          {code.split('\n').map((line, index) => (
            <span key={index} className="block overflow-hidden text-ellipsis whitespace-pre">
              {line || ' '}
            </span>
          ))}
        </code>
      </pre>
      <p className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Code copied to the clipboard' : state === 'failed' ? 'Could not copy the code' : ''}
      </p>
    </div>
  );
};
