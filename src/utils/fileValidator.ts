import { SupportedFormat, detectFileType } from './fileConverter';

export interface ValidationRule {
  id: string;
  name: string;
  validate: (file: File, content?: string) => Promise<ValidationResult>;
  severity: 'error' | 'warning' | 'info';
  category: 'size' | 'format' | 'content' | 'security' | 'performance';
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
  suggestion?: string;
}

export interface FileValidationResult {
  file: File;
  isValid: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
  complexity?: ComplexityAnalysis;
}

export interface ComplexityAnalysis {
  pathCount: number;
  nodeCount: number;
  elementCount: number;
  fileSize: number;
  estimatedRenderTime: number;
  complexityScore: 'low' | 'medium' | 'high' | 'extreme';
  recommendations: string[];
}

export interface ValidationConfig {
  maxFileSize: number; // in bytes
  maxPathCount: number;
  maxNodeCount: number;
  allowedFormats: SupportedFormat[];
  enableSecurityChecks: boolean;
  enablePerformanceChecks: boolean;
}

const DEFAULT_CONFIG: ValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxPathCount: 1000,
  maxNodeCount: 10000,
  allowedFormats: ['svg', 'ai', 'eps', 'pdf', 'png', 'jpg', 'jpeg'],
  enableSecurityChecks: true,
  enablePerformanceChecks: true
};

// Main validation function
export const validateFile = async (
  file: File,
  config: Partial<ValidationConfig> = {}
): Promise<FileValidationResult> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const rules = createValidationRules(finalConfig);
  
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  const info: ValidationResult[] = [];

  // Read file content for content-based validations
  let content: string | undefined;
  try {
    if (file.type.includes('text') || file.name.endsWith('.svg')) {
      content = await file.text();
    }
  } catch (_error) {
    // If we can't read as text, that's okay for binary formats
  }

  // Run all validation rules
  for (const rule of rules) {
    try {
      const result = await rule.validate(file, content);
      
      if (!result.passed) {
        switch (rule.severity) {
          case 'error':
            errors.push(result);
            break;
          case 'warning':
            warnings.push(result);
            break;
          case 'info':
            info.push(result);
            break;
        }
      }
    } catch (error) {
      errors.push({
        passed: false,
        message: `Validation rule "${rule.name}" failed`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Analyze complexity if it's an SVG
  let complexity: ComplexityAnalysis | undefined;
  if (content && detectFileType(file) === 'svg') {
    complexity = analyzeSVGComplexity(content, file.size);
  }

  return {
    file,
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    complexity
  };
};

// Create validation rules based on config
const createValidationRules = (config: ValidationConfig): ValidationRule[] => {
  const rules: ValidationRule[] = [
    // File size validation
    {
      id: 'file-size',
      name: 'File Size Check',
      severity: 'error',
      category: 'size',
      validate: async (file) => {
        if (file.size > config.maxFileSize) {
          return {
            passed: false,
            message: `File size exceeds limit`,
            details: `File is ${formatFileSize(file.size)}, maximum allowed is ${formatFileSize(config.maxFileSize)}`,
            suggestion: 'Try compressing the file or reducing its complexity'
          };
        }
        return { passed: true, message: 'File size is acceptable' };
      }
    },

    // Format validation
    {
      id: 'file-format',
      name: 'File Format Check',
      severity: 'error',
      category: 'format',
      validate: async (file) => {
        const format = detectFileType(file);
        if (!config.allowedFormats.includes(format)) {
          return {
            passed: false,
            message: `Unsupported file format: ${format}`,
            details: `Allowed formats: ${config.allowedFormats.join(', ')}`,
            suggestion: 'Convert your file to a supported format'
          };
        }
        return { passed: true, message: 'File format is supported' };
      }
    },

    // Empty file check
    {
      id: 'empty-file',
      name: 'Empty File Check',
      severity: 'error',
      category: 'content',
      validate: async (file) => {
        if (file.size === 0) {
          return {
            passed: false,
            message: 'File is empty',
            suggestion: 'Please select a valid file with content'
          };
        }
        return { passed: true, message: 'File has content' };
      }
    }
  ];

  // SVG-specific validations
  rules.push(
    {
      id: 'svg-structure',
      name: 'SVG Structure Check',
      severity: 'error',
      category: 'content',
      validate: async (file, content) => {
        if (detectFileType(file) !== 'svg' || !content) {
          return { passed: true, message: 'Not an SVG file' };
        }

        if (!content.includes('<svg')) {
          return {
            passed: false,
            message: 'Invalid SVG structure',
            details: 'No SVG root element found',
            suggestion: 'Ensure the file contains valid SVG markup'
          };
        }

        // Check for proper closing tag
        const openTags = (content.match(/<svg/g) || []).length;
        const closeTags = (content.match(/<\/svg>/g) || []).length;
        
        if (openTags !== closeTags) {
          return {
            passed: false,
            message: 'Malformed SVG structure',
            details: 'Mismatched SVG opening and closing tags',
            suggestion: 'Check that all SVG tags are properly closed'
          };
        }

        return { passed: true, message: 'SVG structure is valid' };
      }
    }
  );

  // Security checks
  if (config.enableSecurityChecks) {
    rules.push(
      {
        id: 'security-scripts',
        name: 'Script Security Check',
        severity: 'error',
        category: 'security',
        validate: async (file, content) => {
          if (!content) return { passed: true, message: 'No content to check' };

          const hasScripts = /<script/i.test(content);
          if (hasScripts) {
            return {
              passed: false,
              message: 'File contains script elements',
              details: 'Script elements are not allowed for security reasons',
              suggestion: 'Remove all script elements from the file'
            };
          }

          return { passed: true, message: 'No security issues detected' };
        }
      },
      {
        id: 'security-external-refs',
        name: 'External Reference Check',
        severity: 'warning',
        category: 'security',
        validate: async (file, content) => {
          if (!content) return { passed: true, message: 'No content to check' };

          const hasExternalRefs = /href\s*=\s*["']https?:\/\//i.test(content) ||
                                 /src\s*=\s*["']https?:\/\//i.test(content);
          
          if (hasExternalRefs) {
            return {
              passed: false,
              message: 'File contains external references',
              details: 'External URLs may not load properly or pose security risks',
              suggestion: 'Consider embedding external resources or removing them'
            };
          }

          return { passed: true, message: 'No external references found' };
        }
      }
    );
  }

  // Performance checks
  if (config.enablePerformanceChecks) {
    rules.push(
      {
        id: 'performance-complexity',
        name: 'Performance Complexity Check',
        severity: 'warning',
        category: 'performance',
        validate: async (file, content) => {
          if (detectFileType(file) !== 'svg' || !content) {
            return { passed: true, message: 'Not an SVG file' };
          }

          const pathCount = (content.match(/<path/g) || []).length;
          const circleCount = (content.match(/<circle/g) || []).length;
          const rectCount = (content.match(/<rect/g) || []).length;
          const totalShapes = pathCount + circleCount + rectCount;

          if (totalShapes > config.maxPathCount) {
            return {
              passed: false,
              message: 'High complexity SVG detected',
              details: `File contains ${totalShapes} shapes, which may impact performance`,
              suggestion: 'Consider simplifying the SVG or breaking it into smaller parts'
            };
          }

          if (pathCount > config.maxPathCount * 0.8) {
            return {
              passed: false,
              message: 'Many path elements detected',
              details: `File contains ${pathCount} path elements`,
              suggestion: 'Consider optimizing paths or using simpler shapes where possible'
            };
          }

          return { passed: true, message: 'Complexity is acceptable' };
        }
      }
    );
  }

  return rules;
};

// Analyze SVG complexity
const analyzeSVGComplexity = (content: string, fileSize: number): ComplexityAnalysis => {
  const pathCount = (content.match(/<path/g) || []).length;
  const circleCount = (content.match(/<circle/g) || []).length;
  const rectCount = (content.match(/<rect/g) || []).length;
  const ellipseCount = (content.match(/<ellipse/g) || []).length;
  const lineCount = (content.match(/<line/g) || []).length;
  const polygonCount = (content.match(/<polygon/g) || []).length;
  const polylineCount = (content.match(/<polyline/g) || []).length;

  const elementCount = pathCount + circleCount + rectCount + ellipseCount + 
                      lineCount + polygonCount + polylineCount;

  // Estimate node count (rough approximation)
  const avgNodesPerPath = 10; // Rough estimate
  const nodeCount = pathCount * avgNodesPerPath + (elementCount - pathCount) * 2;

  // Calculate complexity score
  let complexityScore: ComplexityAnalysis['complexityScore'] = 'low';
  const recommendations: string[] = [];

  if (elementCount > 500 || nodeCount > 5000 || fileSize > 1024 * 1024) {
    complexityScore = 'extreme';
    recommendations.push('Consider breaking this into multiple smaller SVGs');
    recommendations.push('Use SVG optimization tools to reduce file size');
  } else if (elementCount > 200 || nodeCount > 2000 || fileSize > 512 * 1024) {
    complexityScore = 'high';
    recommendations.push('Consider simplifying some paths');
    recommendations.push('Remove unnecessary elements and attributes');
  } else if (elementCount > 50 || nodeCount > 500 || fileSize > 100 * 1024) {
    complexityScore = 'medium';
    recommendations.push('Good complexity level for smooth animations');
  } else {
    recommendations.push('Low complexity - excellent for smooth animations');
  }

  // Estimate render time (very rough approximation)
  const estimatedRenderTime = Math.max(1, Math.floor(elementCount * 0.1 + nodeCount * 0.01));

  return {
    pathCount,
    nodeCount,
    elementCount,
    fileSize,
    estimatedRenderTime,
    complexityScore,
    recommendations
  };
};

// Batch validation
export const validateMultipleFiles = async (
  files: File[],
  config: Partial<ValidationConfig> = {},
  onProgress?: (index: number, result: FileValidationResult) => void
): Promise<FileValidationResult[]> => {
  const results: FileValidationResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await validateFile(files[i], config);
    results.push(result);
    onProgress?.(i, result);
  }

  return results;
};

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getValidationSummary = (results: FileValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  totalErrors: number;
  totalWarnings: number;
} => {
  return {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    warnings: results.filter(r => r.warnings.length > 0).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
  };
};

export const createCustomValidationRule = (
  id: string,
  name: string,
  validator: (file: File, content?: string) => Promise<ValidationResult>,
  severity: ValidationRule['severity'] = 'warning',
  category: ValidationRule['category'] = 'content'
): ValidationRule => {
  return {
    id,
    name,
    validate: validator,
    severity,
    category
  };
};
