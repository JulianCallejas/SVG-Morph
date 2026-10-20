import React from 'react';

const ACCENT = 'accent-[rgb(var(--color-action))]';

export const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium">{label}</span>
    {children}
  </label>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', ...props }) => (
  <select className={`h-11 w-full bg-raised px-3 text-content ${className}`} {...props} />
);

export const Slider: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>> = ({
  className = '',
  ...props
}) => <input type="range" className={`h-11 w-full ${ACCENT} ${className}`} {...props} />;

interface CheckRowProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const CheckRow: React.FC<CheckRowProps> = ({ label, className = '', ...props }) => (
  <label className="flex min-h-11 cursor-pointer items-center gap-3 bg-raised px-3 py-2 hover:bg-line/30">
    <input type="checkbox" className={`h-5 w-5 ${ACCENT} ${className}`} {...props} />
    <span className="text-sm font-medium">{label}</span>
  </label>
);
