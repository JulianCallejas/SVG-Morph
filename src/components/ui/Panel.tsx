import React from 'react';

interface PanelProps {
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// A flat block one tone above the page: no border, no shadow, no rounded corners.
export const Panel: React.FC<PanelProps> = ({ title, actions, className = '', children }) => (
  <section aria-label={title} className={`bg-surface p-5 sm:p-6 ${className}`}>
    {(title || actions) && (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        {title && <h2 className="text-xl font-medium">{title}</h2>}
        {actions}
      </div>
    )}
    {children}
  </section>
);
