import React, { useState, useCallback, useRef } from 'react';
import { Upload, File, AlertCircle, CheckCircle, X, Eye, Settings, Zap } from 'lucide-react';
import { convertToSVG, ConversionResult, ConversionProgress, detectFileType, getFormatDisplayName } from '../utils/fileConverter';
import { validateFile, FileValidationResult, formatFileSize } from '../utils/fileValidator';
import { FileUploadLoading, LoadingButton } from './LoadingStates';

interface EnhancedFileUploadZoneProps {
  onFileSelect: (svgContent: string, fileName: string) => void;
  accept?: string;
  maxFiles?: number;
  title?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

interface FileProcessingState {
  file: File;
  status: 'validating' | 'converting' | 'complete' | 'error';
  validation?: FileValidationResult;
  conversion?: ConversionResult;
  progress: number;
  currentStage?: string;
}

export const EnhancedFileUploadZone: React.FC<EnhancedFileUploadZoneProps> = ({
  onFileSelect,
  accept = '.svg,.ai,.eps,.pdf,.png,.jpg,.jpeg',
  maxFiles = 1,
  title = 'Upload SVG or Vector File',
  description = 'Drag and drop your file here, or click to browse',
  className = '',
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<FileProcessingState[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
    if (files.length > 0) {
      processFiles(files);
    }
  }, [disabled, maxFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, maxFiles);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [maxFiles]);

  const processFiles = async (files: File[]) => {
    const initialStates: FileProcessingState[] = files.map(file => ({
      file,
      status: 'validating',
      progress: 0
    }));

    setProcessingFiles(initialStates);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Update status to validating
        setProcessingFiles(prev => prev.map((state, index) => 
          index === i ? { ...state, status: 'validating', progress: 10, currentStage: 'Validating file...' } : state
        ));

        // Validate file
        const validation = await validateFile(file);
        
        setProcessingFiles(prev => prev.map((state, index) => 
          index === i ? { ...state, validation, progress: 30 } : state
        ));

        // If validation failed with errors, mark as error
        if (!validation.isValid) {
          setProcessingFiles(prev => prev.map((state, index) => 
            index === i ? { 
              ...state, 
              status: 'error', 
              progress: 100,
              currentStage: 'Validation failed'
            } : state
          ));
          continue;
        }

        // Update status to converting
        setProcessingFiles(prev => prev.map((state, index) => 
          index === i ? { ...state, status: 'converting', progress: 40, currentStage: 'Converting to SVG...' } : state
        ));

        // Convert to SVG
        const conversion = await convertToSVG(file, (progress: ConversionProgress) => {
          setProcessingFiles(prev => prev.map((state, index) => 
            index === i ? { 
              ...state, 
              progress: 40 + (progress.progress * 0.5), // 40-90% for conversion
              currentStage: progress.message
            } : state
          ));
        });

        setProcessingFiles(prev => prev.map((state, index) => 
          index === i ? { ...state, conversion, progress: 90 } : state
        ));

        if (conversion.success && conversion.svgContent) {
          // Success!
          setProcessingFiles(prev => prev.map((state, index) => 
            index === i ? { 
              ...state, 
              status: 'complete', 
              progress: 100,
              currentStage: 'Complete!'
            } : state
          ));

          // Call the callback with the SVG content
          onFileSelect(conversion.svgContent, file.name);
        } else {
          // Conversion failed
          setProcessingFiles(prev => prev.map((state, index) => 
            index === i ? { 
              ...state, 
              status: 'error', 
              progress: 100,
              currentStage: 'Conversion failed'
            } : state
          ));
        }

      } catch (error) {
        setProcessingFiles(prev => prev.map((state, index) => 
          index === i ? { 
            ...state, 
            status: 'error', 
            progress: 100,
            currentStage: 'Processing failed'
          } : state
        ));
      }
    }
  };

  const removeProcessingFile = (index: number) => {
    setProcessingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const retryProcessing = (index: number) => {
    const file = processingFiles[index]?.file;
    if (file) {
      processFiles([file]);
    }
  };

  const clearAll = () => {
    setProcessingFiles([]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            isDragOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`} />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{description}</p>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>Supported formats: SVG, AI, EPS, PDF, PNG, JPG</p>
              <p>Maximum file size: 10MB</p>
            </div>
          </div>

          <LoadingButton
            isLoading={false}
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={disabled}
          >
            Choose Files
          </LoadingButton>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAdvancedOptions(!showAdvancedOptions);
          }}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Advanced Options"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Advanced Options Panel */}
      {showAdvancedOptions && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Advanced Options</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-gray-700 mb-1">File Size Limit</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="10">10 MB (Default)</option>
                <option value="5">5 MB</option>
                <option value="20">20 MB</option>
                <option value="50">50 MB</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1">Validation Level</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="standard">Standard</option>
                <option value="strict">Strict</option>
                <option value="permissive">Permissive</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Enable security checks</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Processing Files */}
      {processingFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Processing Files</h4>
            <button
              onClick={clearAll}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {processingFiles.map((fileState, index) => (
              <FileProcessingCard
                key={`${fileState.file.name}-${index}`}
                fileState={fileState}
                onRemove={() => removeProcessingFile(index)}
                onRetry={() => retryProcessing(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Individual file processing card component
const FileProcessingCard: React.FC<{
  fileState: FileProcessingState;
  onRemove: () => void;
  onRetry: () => void;
}> = ({ fileState, onRemove, onRetry }) => {
  const { file, status, validation, conversion, progress, currentStage } = fileState;
  const format = detectFileType(file);

  const getStatusIcon = () => {
    switch (status) {
      case 'validating':
      case 'converting':
        return <Zap className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'validating':
      case 'converting':
        return 'border-blue-200 bg-blue-50';
      case 'complete':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{getFormatDisplayName(format)}</span>
              <span>•</span>
              <span>{formatFileSize(file.size)}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      {status !== 'complete' && status !== 'error' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{currentStage}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="space-y-2">
          {validation.errors.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-red-700 mb-1">Errors:</p>
              <ul className="space-y-1 text-red-600">
                {validation.errors.map((error, i) => (
                  <li key={i}>• {error.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-yellow-700 mb-1">Warnings:</p>
              <ul className="space-y-1 text-yellow-600">
                {validation.warnings.slice(0, 2).map((warning, i) => (
                  <li key={i}>• {warning.message}</li>
                ))}
                {validation.warnings.length > 2 && (
                  <li className="text-gray-500">... and {validation.warnings.length - 2} more</li>
                )}
              </ul>
            </div>
          )}

          {validation.complexity && (
            <div className="text-xs text-gray-600">
              <p>Complexity: <span className="font-medium">{validation.complexity.complexityScore}</span></p>
              <p>{validation.complexity.elementCount} elements, {validation.complexity.pathCount} paths</p>
            </div>
          )}
        </div>
      )}

      {/* Conversion Error */}
      {conversion && !conversion.success && (
        <div className="text-xs text-red-600 mt-2">
          <p className="font-medium">Conversion Error:</p>
          <p>{conversion.error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {status === 'error' && (
        <div className="mt-3 flex space-x-2">
          <button
            onClick={onRetry}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
