import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

// The icon shape tells the types apart; color only reinforces it.
// Text stays on the surface tone: the danger color is not AA on the raised tone.
const toastConfig = {
  success: { icon: CheckCircle, barColor: 'bg-action', iconColor: 'text-action' },
  error: { icon: XCircle, barColor: 'bg-danger', iconColor: 'text-danger' },
  warning: { icon: AlertCircle, barColor: 'bg-gold-400', iconColor: 'text-gold-400' },
  info: { icon: Info, barColor: 'bg-line', iconColor: 'text-content' },
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const config = toastConfig[type];
  const Icon = config.icon;

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match exit animation duration
  }, [id, onClose]);

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-close timer
    const closeTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, handleClose]);

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`
        relative mb-3 w-full max-w-md overflow-hidden bg-surface p-4 pl-5 text-content shadow-lg
        transform transition-all duration-300 ease-out motion-reduce:transition-none
        ${isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
        }
      `}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${config.barColor}`} />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconColor}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">
            {title}
          </h4>
          {message && (
            <p className="text-sm text-muted leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-muted transition-colors duration-200 hover:bg-raised hover:text-content"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1 bg-raised">
        <div
          className="h-full bg-action"
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // top-20 keeps the stack below the sticky header; z-[60] keeps it above the header.
  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col items-end space-y-2">
      {children}
    </div>
  );
};
