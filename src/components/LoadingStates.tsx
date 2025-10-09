import React from 'react';
import { Loader2, Upload, Cpu, Zap, Download, CheckCircle, AlertCircle } from 'lucide-react';

// Basic Loading Spinner
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

// Progress Bar Component
export const ProgressBar: React.FC<{
  progress: number;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'red';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}> = ({ 
  progress, 
  showPercentage = true, 
  color = 'blue', 
  size = 'md',
  animated = true 
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className="w-full">
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

// Skeleton Loader
export const SkeletonLoader: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-300 rounded h-4 mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// File Upload Loading State
export const FileUploadLoading: React.FC<{
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}> = ({ fileName, progress, status }) => {
  const getIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <Cpu className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'blue';
      case 'processing':
        return 'purple';
      case 'complete':
        return 'green';
      case 'error':
        return 'red';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center space-x-3 mb-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
          <p className="text-xs text-gray-500">{getStatusText()}</p>
        </div>
      </div>
      
      {status !== 'complete' && status !== 'error' && (
        <ProgressBar 
          progress={progress} 
          color={getStatusColor() as any}
          showPercentage={false}
          size="sm"
        />
      )}
    </div>
  );
};

// SVG Processing Loading State
export const SVGProcessingLoading: React.FC<{
  currentTask: string;
  progress: number;
  steps: string[];
  currentStepIndex: number;
}> = ({ currentTask, progress, steps, currentStepIndex }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Processing SVG</h3>
        <p className="text-gray-600 mt-1">{currentTask}</p>
      </div>

      <ProgressBar progress={progress} color="blue" />

      <div className="mt-6 space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              index < currentStepIndex ? 'bg-green-500' :
              index === currentStepIndex ? 'bg-blue-500 animate-pulse' :
              'bg-gray-300'
            }`} />
            <span className={`text-sm ${
              index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Animation Loading State
export const AnimationLoading: React.FC<{
  isGenerating: boolean;
  currentFrame?: number;
  totalFrames?: number;
}> = ({ isGenerating, currentFrame, totalFrames }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          {/* Animated ring */}
          <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isGenerating ? 'Generating Animation' : 'Preparing Animation'}
        </h3>
        
        {currentFrame && totalFrames && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Frame {currentFrame} of {totalFrames}
            </p>
            <ProgressBar 
              progress={(currentFrame / totalFrames) * 100}
              showPercentage={false}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Export Loading State
export const ExportLoading: React.FC<{
  format: string;
  progress: number;
  stage: 'preparing' | 'rendering' | 'encoding' | 'complete';
}> = ({ format, progress, stage }) => {
  const getStageText = () => {
    switch (stage) {
      case 'preparing':
        return 'Preparing export...';
      case 'rendering':
        return 'Rendering frames...';
      case 'encoding':
        return `Encoding ${format.toUpperCase()}...`;
      case 'complete':
        return 'Export complete!';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <Download className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Exporting {format.toUpperCase()}</h4>
          <p className="text-sm text-gray-600">{getStageText()}</p>
        </div>
      </div>
      
      <ProgressBar progress={progress} color="green" />
      
      {stage === 'complete' && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">Your file is ready for download!</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Full Page Loading Overlay
export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  message?: string;
  progress?: number;
  onCancel?: () => void;
}> = ({ isVisible, message = 'Loading...', progress, onCancel }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
          
          {progress !== undefined && (
            <div className="mb-4">
              <ProgressBar progress={progress} showPercentage />
            </div>
          )}
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Button Loading State
export const LoadingButton: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  isLoading, 
  children, 
  onClick, 
  disabled, 
  variant = 'primary',
  size = 'md'
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {children}
    </button>
  );
};
