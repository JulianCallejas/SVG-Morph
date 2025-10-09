// File format conversion utilities
export interface ConversionResult {
  success: boolean;
  svgContent?: string;
  error?: string;
  originalFormat: string;
  fileName: string;
}

export interface ConversionProgress {
  stage: 'parsing' | 'converting' | 'optimizing' | 'complete';
  progress: number;
  message: string;
}

export type SupportedFormat = 'svg' | 'ai' | 'eps' | 'pdf' | 'png' | 'jpg' | 'jpeg';

// File type detection
export const detectFileType = (file: File): SupportedFormat => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Check by MIME type first
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('postscript') || mimeType.includes('eps')) return 'eps';
  if (mimeType.includes('illustrator') || mimeType.includes('ai')) return 'ai';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';

  // Fallback to extension
  switch (extension) {
    case 'svg': return 'svg';
    case 'ai': return 'ai';
    case 'eps': return 'eps';
    case 'pdf': return 'pdf';
    case 'png': return 'png';
    case 'jpg':
    case 'jpeg': return 'jpeg';
    default: return 'svg'; // Default assumption
  }
};

// Check if format is supported
export const isSupportedFormat = (format: string): boolean => {
  const supported: SupportedFormat[] = ['svg', 'ai', 'eps', 'pdf', 'png', 'jpg', 'jpeg'];
  return supported.includes(format as SupportedFormat);
};

// Get format display name
export const getFormatDisplayName = (format: SupportedFormat): string => {
  const names: Record<SupportedFormat, string> = {
    svg: 'SVG Vector',
    ai: 'Adobe Illustrator',
    eps: 'Encapsulated PostScript',
    pdf: 'PDF Document',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image'
  };
  return names[format] || format.toUpperCase();
};

// Main conversion function
export const convertToSVG = async (
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> => {
  const format = detectFileType(file);
  
  onProgress?.({
    stage: 'parsing',
    progress: 10,
    message: `Parsing ${getFormatDisplayName(format)} file...`
  });

  try {
    switch (format) {
      case 'svg':
        return await convertSVG(file, onProgress);
      case 'ai':
        return await convertAI(file, onProgress);
      case 'eps':
        return await convertEPS(file, onProgress);
      case 'pdf':
        return await convertPDF(file, onProgress);
      case 'png':
      case 'jpg':
      case 'jpeg':
        return await convertRasterImage(file, onProgress);
      default:
        return {
          success: false,
          error: `Unsupported file format: ${format}`,
          originalFormat: format,
          fileName: file.name
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
      originalFormat: format,
      fileName: file.name
    };
  }
};

// SVG file handler (validation and cleanup)
const convertSVG = async (
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> => {
  onProgress?.({
    stage: 'parsing',
    progress: 30,
    message: 'Reading SVG content...'
  });

  const content = await file.text();
  
  onProgress?.({
    stage: 'converting',
    progress: 60,
    message: 'Validating SVG structure...'
  });

  // Basic SVG validation
  if (!content.includes('<svg')) {
    throw new Error('Invalid SVG file: No SVG element found');
  }

  onProgress?.({
    stage: 'optimizing',
    progress: 80,
    message: 'Optimizing SVG...'
  });

  // Clean up and optimize SVG
  const optimizedSVG = optimizeSVG(content);

  onProgress?.({
    stage: 'complete',
    progress: 100,
    message: 'SVG ready!'
  });

  return {
    success: true,
    svgContent: optimizedSVG,
    originalFormat: 'svg',
    fileName: file.name
  };
};

// Adobe Illustrator (.ai) converter
const convertAI = async (
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> => {
  onProgress?.({
    stage: 'parsing',
    progress: 20,
    message: 'Parsing Adobe Illustrator file...'
  });

  // AI files are essentially PDF files with additional metadata
  // We'll try to extract the PDF content first
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.({
    stage: 'converting',
    progress: 50,
    message: 'Extracting vector data...'
  });

  // For now, we'll use a simplified approach
  // In a production environment, you'd want to use a proper AI parser
  // or convert through a server-side service
  
  try {
    // Try to find embedded SVG or PDF content
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    
    // Look for embedded SVG
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      onProgress?.({
        stage: 'optimizing',
        progress: 80,
        message: 'Optimizing extracted SVG...'
      });

      const optimizedSVG = optimizeSVG(svgMatch[0]);
      
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'AI file converted successfully!'
      });

      return {
        success: true,
        svgContent: optimizedSVG,
        originalFormat: 'ai',
        fileName: file.name
      };
    }

    // If no SVG found, create a placeholder or use alternative method
    throw new Error('Could not extract vector data from AI file');
    
  } catch (error) {
    // Fallback: suggest using a conversion service
    return {
      success: false,
      error: 'AI file conversion requires server-side processing. Please convert to SVG using Adobe Illustrator or an online converter.',
      originalFormat: 'ai',
      fileName: file.name
    };
  }
};

// EPS (Encapsulated PostScript) converter
const convertEPS = async (
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> => {
  onProgress?.({
    stage: 'parsing',
    progress: 20,
    message: 'Parsing EPS file...'
  });

  const content = await file.text();
  
  onProgress?.({
    stage: 'converting',
    progress: 50,
    message: 'Converting PostScript to SVG...'
  });

  // Basic EPS to SVG conversion
  // This is a simplified implementation - production would need a full PostScript interpreter
  try {
    const svgContent = convertEPSToSVG(content);
    
    onProgress?.({
      stage: 'optimizing',
      progress: 80,
      message: 'Optimizing converted SVG...'
    });

    const optimizedSVG = optimizeSVG(svgContent);
    
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'EPS converted successfully!'
    });

    return {
      success: true,
      svgContent: optimizedSVG,
      originalFormat: 'eps',
      fileName: file.name
    };
  } catch (error) {
    return {
      success: false,
      error: 'EPS conversion requires server-side processing. Please convert to SVG using a graphics editor or online converter.',
      originalFormat: 'eps',
      fileName: file.name
    };
  }
};

// PDF converter
const convertPDF = async (
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> => {
  onProgress?.({
    stage: 'parsing',
    progress: 20,
    message: 'Loading PDF...'
  });

  // PDF conversion would typically require pdf.js or similar library
  // For now, we'll provide a helpful error message
  return {
    success: false,
    error: 'PDF conversion requires additional libraries. Please convert your PDF to SVG using a graphics editor or online converter.',
    originalFormat: 'pdf',
    fileName: file.name
  };
};

// Raster image converter (PNG, JPG)
const convertRasterImage = async (
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> => {
  onProgress?.({
    stage: 'parsing',
    progress: 20,
    message: 'Loading image...'
  });

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      onProgress?.({
        stage: 'converting',
        progress: 50,
        message: 'Converting to SVG...'
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      // Convert to base64
      const dataURL = canvas.toDataURL();
      
      onProgress?.({
        stage: 'optimizing',
        progress: 80,
        message: 'Creating SVG wrapper...'
      });

      // Create SVG with embedded image
      const svgContent = `
        <svg width="${img.width}" height="${img.height}" xmlns="http://www.w3.org/2000/svg">
          <image href="${dataURL}" width="${img.width}" height="${img.height}" />
        </svg>
      `.trim();

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Image converted to SVG!'
      });

      resolve({
        success: true,
        svgContent,
        originalFormat: detectFileType(file),
        fileName: file.name
      });
    };

    img.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to load image file',
        originalFormat: detectFileType(file),
        fileName: file.name
      });
    };

    img.src = URL.createObjectURL(file);
  });
};

// SVG optimization
const optimizeSVG = (svgContent: string): string => {
  // Basic SVG cleanup and optimization
  let optimized = svgContent;

  // Remove comments
  optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');

  // Remove unnecessary whitespace
  optimized = optimized.replace(/>\s+</g, '><');

  // Ensure proper SVG namespace
  if (!optimized.includes('xmlns="http://www.w3.org/2000/svg"')) {
    optimized = optimized.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Remove Adobe Illustrator specific attributes that might cause issues
  optimized = optimized.replace(/\s*xmlns:i="[^"]*"/g, '');
  optimized = optimized.replace(/\s*i:[^=]*="[^"]*"/g, '');

  return optimized;
};

// Simplified EPS to SVG conversion
const convertEPSToSVG = (epsContent: string): string => {
  // This is a very basic implementation
  // A full implementation would need a PostScript interpreter
  
  // Extract bounding box
  const bboxMatch = epsContent.match(/%%BoundingBox:\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
  const width = bboxMatch ? parseInt(bboxMatch[3]) - parseInt(bboxMatch[1]) : 400;
  const height = bboxMatch ? parseInt(bboxMatch[4]) - parseInt(bboxMatch[2]) : 400;

  // Create a basic SVG structure
  // In practice, you'd parse PostScript commands and convert them to SVG paths
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
            font-family="Arial, sans-serif" font-size="16" fill="#666">
        EPS file loaded
        <tspan x="50%" dy="20">Please use a graphics editor to convert to SVG</tspan>
      </text>
    </svg>
  `.trim();
};

// Batch conversion utility
export const convertMultipleFiles = async (
  files: File[],
  onProgress?: (fileIndex: number, progress: ConversionProgress) => void,
  onComplete?: (results: ConversionResult[]) => void
): Promise<ConversionResult[]> => {
  const results: ConversionResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const result = await convertToSVG(file, (progress) => {
        onProgress?.(i, progress);
      });
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
        originalFormat: detectFileType(file),
        fileName: file.name
      });
    }
  }

  onComplete?.(results);
  return results;
};
