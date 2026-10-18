import React from 'react';
import { useMorphStore } from '../store/morphStore';

export const ProcessingIndicator: React.FC = () => {
  const { processingState, isAnimating } = useMorphStore();
  const { isProcessing, currentTask, progress, error } = processingState;

  if (!isProcessing && !error && !isAnimating) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[60] max-w-sm" role="status">
      <div className="bg-surface p-4 text-content shadow-lg">
        {error ? (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg aria-hidden="true" className="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-danger">
                Processing Error
              </h3>
              <p className="text-sm text-muted mt-1">
                {error}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {isAnimating ? (
                  <svg aria-hidden="true" className="w-5 h-5 text-action animate-spin motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="w-5 h-5 text-action animate-pulse motion-reduce:animate-none" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">
                  {isAnimating ? 'Animating...' : currentTask || 'Processing...'}
                </h3>
                {!isAnimating && (
                  <p className="text-sm text-muted mt-1">
                    {Math.round(progress)}% complete
                  </p>
                )}
              </div>
            </div>

            {!isAnimating && (
              <div className="w-full bg-raised h-2">
                <div
                  className="bg-action h-2 transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingIndicator;
