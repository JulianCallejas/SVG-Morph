import React, { useState, useCallback, useRef } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { convertToSVG, type ConversionResult, type ConversionProgress } from '../utils/fileConverter';
import { validateFile, type FileValidationResult } from '../utils/fileValidator';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface EnhancedFileUploadZoneProps {
  onFileSelect: (svgContent: string, fileName: string) => void;
  maxFiles?: number;
  disabled?: boolean;
}

type FileStatus = 'validating' | 'converting' | 'complete' | 'error';

interface FileProcessingState {
  file: File;
  status: FileStatus;
  validation?: FileValidationResult;
  conversion?: ConversionResult;
  progress: number;
  currentStage?: string;
}

export const EnhancedFileUploadZone: React.FC<EnhancedFileUploadZoneProps> = ({
  onFileSelect,
  maxFiles = 1,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<FileProcessingState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: File[]) => {
    const initialStates: FileProcessingState[] = files.map(file => ({
      file,
      status: 'validating' as const,
      progress: 0
    }));

    setProcessingFiles(initialStates);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Update status to validating
        setProcessingFiles((prev: FileProcessingState[]) => 
          prev.map((state: FileProcessingState, index: number) => 
            index === i ? { ...state, status: 'validating', progress: 10, currentStage: 'Validating file...' } : state
          )
        );

        // Validate file
        const validation = await validateFile(file);
        
        setProcessingFiles((prev: FileProcessingState[]) => 
          prev.map((state: FileProcessingState, index: number) => 
            index === i ? { ...state, validation, progress: 30 } : state
          )
        );

        // If validation failed with errors, mark as error
        if (!validation.isValid) {
          setProcessingFiles((prev: FileProcessingState[]) => 
            prev.map((state: FileProcessingState, index: number) => 
              index === i ? { 
                ...state, 
                status: 'error', 
                progress: 100,
                currentStage: 'Validation failed'
              } : state
            )
          );
          continue;
        }

        // Update status to converting
        setProcessingFiles((prev: FileProcessingState[]) => 
          prev.map((state: FileProcessingState, index: number) => 
            index === i ? { ...state, status: 'converting', progress: 40, currentStage: 'Converting to SVG...' } : state
          )
        );

        // Convert to SVG
        const conversion = await convertToSVG(file, (progress: ConversionProgress) => {
          setProcessingFiles((prev: FileProcessingState[]) => 
            prev.map((state: FileProcessingState, idx: number) => 
              idx === i ? { 
                ...state, 
                progress: 40 + (progress.progress * 0.5), // 40-90% for conversion
                currentStage: progress.message
              } : state
            )
          );
        });

        setProcessingFiles((prev: FileProcessingState[]) => 
          prev.map((state: FileProcessingState, idx: number) => 
            idx === i ? { ...state, conversion, progress: 90 } : state
          )
        );

        if (conversion.success && conversion.svgContent) {
          // Success!
          setProcessingFiles((prev: FileProcessingState[]) => 
            prev.map((state: FileProcessingState, idx: number) => 
              idx === i ? { 
                ...state, 
                status: 'complete', 
                progress: 100,
                currentStage: 'Complete!'
              } : state
            )
          );

          // Call the callback with the SVG content
          onFileSelect(conversion.svgContent, file.name);
        } else {
          // Conversion failed
          setProcessingFiles((prev: FileProcessingState[]) => 
            prev.map((state: FileProcessingState, idx: number) => 
              idx === i ? { 
                ...state, 
                status: 'error', 
                progress: 100,
                currentStage: 'Conversion failed'
              } : state
            )
          );
        }
      } catch (error) {
        console.error('Error processing file:', error);
        setProcessingFiles((prev: FileProcessingState[]) => 
          prev.map((state: FileProcessingState, idx: number) => 
            idx === i ? { 
              ...state, 
              status: 'error', 
              progress: 100,
              currentStage: 'Processing failed'
            } : state
          )
        );
      }
    }
  }, [onFileSelect]);

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
  }, [disabled, maxFiles, processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, maxFiles);
      processFiles(files);
    }
  }, [maxFiles, processFiles]);

  const removeProcessingFile = useCallback((index: number) => {
    setProcessingFiles((prev: FileProcessingState[]) => prev.filter((_, i) => i !== index));
  }, []);

  const retryProcessing = useCallback((index: number) => {
    const file = processingFiles[index]?.file;
    if (file) {
      processFiles([file]);
    }
  }, [processFiles, processingFiles]);

  // Render the component
  return (
    <div className="space-y-4">
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver && !disabled ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary-400'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-full bg-primary-100">
            <CheckCircle className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">SVG, AI, EPS, or PDF (max 10MB)</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".svg,.ai,.eps,.pdf"
          multiple={maxFiles > 1}
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </div>

      {processingFiles.length > 0 && (
        <div className="space-y-2">
          {processingFiles.map((state: FileProcessingState, index: number) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {state.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(state.file.size)} • {state.currentStage}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {state.status === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : state.status === 'error' ? (
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => retryProcessing(index)}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProcessingFile(index)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
              {state.progress > 0 && state.status !== 'complete' && state.status !== 'error' && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
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
          setProcessingFiles(prev => prev.map((state, idx) => 
            idx === i ? { 
              ...state, 
              progress: 40 + (progress.progress * 0.5), // 40-90% for conversion
              currentStage: progress.message
            } : state
          ));
        });

        setProcessingFiles(prev => prev.map((state, idx) => 
          idx === i ? { ...state, conversion, progress: 90 } : state
        ));

        if (conversion.success && conversion.svgContent) {
          // Success!
          setProcessingFiles(prev => prev.map((state, idx) => 
            idx === i ? { 
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
          setProcessingFiles(prev => prev.map((state, idx) => 
            idx === i ? { 
              ...state, 
              status: 'error', 
              progress: 100,
              currentStage: 'Conversion failed'
            } : state
          ));
        }

      } catch (error) {
        console.error('Error processing file:', error);
        setProcessingFiles(prev => prev.map((state, idx) => 
          idx === i ? { 
            ...state, 
            status: 'error', 
            progress: 100,
            currentStage: 'Processing failed'
          } : state
        ));
      }
    }
  }, [onFileSelect]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, maxFiles);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [maxFiles, processFiles]);

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
