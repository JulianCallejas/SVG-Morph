import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-action text-on-action hover:bg-sun-300',
  secondary: 'bg-raised text-content hover:bg-line/40',
  ghost: 'text-content hover:bg-raised',
};

const SIZES: Record<Size, string> = {
  md: 'h-11 px-5',
  icon: 'h-12 w-12 justify-center',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`press inline-flex items-center gap-2 whitespace-nowrap font-medium disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
