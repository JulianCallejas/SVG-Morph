import React, { useCallback, useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadZoneProps {
  label: string;
  onUpload: (file: File, content: string) => Promise<void>;
  hasFile: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  label,
  onUpload,
  hasFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateSVG = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.includes('svg')) {
        reject('Please upload an SVG file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // Basic SVG validation
        if (!content.includes('<svg')) {
          reject('Invalid SVG format');
          return;
        }

        // Extract viewBox or width/height for dimension validation
        const svgMatch = content.match(/<svg[^>]*>/);
        if (svgMatch) {
          const svgTag = svgMatch[0];
          const viewBoxMatch = svgTag.match(/viewBox\s*=\s*["']?([^"']*)/);
          const widthMatch = svgTag.match(/width\s*=\s*["']?([^"']*)/);
          const heightMatch = svgTag.match(/height\s*=\s*["']?([^"']*)/);

          let width = 0, height = 0;

          if (viewBoxMatch) {
            const viewBox = viewBoxMatch[1].split(/\s+/);
            if (viewBox.length >= 4) {
              width = parseFloat(viewBox[2]);
              height = parseFloat(viewBox[3]);
            }
          } else if (widthMatch && heightMatch) {
            width = parseFloat(widthMatch[1]);
            height = parseFloat(heightMatch[1]);
          }

          // For demo purposes, we'll be flexible with dimensions
          if (width > 0 && height > 0) {
            resolve(content);
          } else {
            reject('Could not determine SVG dimensions');
          }
        } else {
          reject('Invalid SVG structure');
        }
      };
      reader.onerror = () => reject('Failed to read file');
      reader.readAsText(file);
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsValidating(true);

    try {
      const content = await validateSVG(file);
      await onUpload(file, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsValidating(false);
    }
  }, [validateSVG, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-accent bg-accent/5 scale-105'
            : hasFile
            ? 'border-accent bg-accent/5'
            : error
            ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-accent hover:bg-accent/5'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-2">
          {isValidating ? (
            <div className="animate-spin w-8 h-8 mx-auto border-2 border-accent border-t-transparent rounded-full"></div>
          ) : hasFile ? (
            <CheckCircle className="w-8 h-8 mx-auto text-accent" />
          ) : error ? (
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
          ) : (
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
          )}
          
          <div>
            {isValidating ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Validating SVG...
              </p>
            ) : hasFile ? (
              <p className="text-sm text-accent font-medium">
                SVG uploaded successfully
              </p>
            ) : error ? (
              <p className="text-sm text-red-500">
                {error}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Drop your SVG here or click to browse
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Supports .svg files
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};