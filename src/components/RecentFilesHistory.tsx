import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Star, StarOff, Search, Filter, Download, Eye } from 'lucide-react';
import { formatFileSize } from '../utils/fileValidator';

export interface RecentFile {
  id: string;
  name: string;
  svgContent: string;
  thumbnail?: string;
  size: number;
  lastUsed: Date;
  isFavorite: boolean;
  tags: string[];
  projectName?: string;
  metadata?: {
    pathCount: number;
    elementCount: number;
    complexity: 'low' | 'medium' | 'high' | 'extreme';
  };
}

interface RecentFilesHistoryProps {
  onFileSelect: (file: RecentFile) => void;
  onFileDelete?: (fileId: string) => void;
  maxFiles?: number;
  className?: string;
}

export const RecentFilesHistory: React.FC<RecentFilesHistoryProps> = ({
  onFileSelect,
  onFileDelete,
  maxFiles = 50,
  className = ''
}) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'favorites' | 'recent'>('all');
  const [sortBy, setSortBy] = useState<'lastUsed' | 'name' | 'size'>('lastUsed');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load recent files from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('svg-morph-recent-files');
      if (saved) {
        const parsed = JSON.parse(saved);
        const files = parsed.map((file: any) => ({
          ...file,
          lastUsed: new Date(file.lastUsed)
        }));
        setRecentFiles(files);
      }
    } catch (error) {
      console.error('Failed to load recent files:', error);
    }
  }, []);

  // Save recent files to localStorage
  const saveRecentFiles = (files: RecentFile[]) => {
    try {
      localStorage.setItem('svg-morph-recent-files', JSON.stringify(files));
    } catch (error) {
      console.error('Failed to save recent files:', error);
    }
  };

  // Add file to recent history
  const addRecentFile = (file: Omit<RecentFile, 'id' | 'lastUsed' | 'isFavorite'>) => {
    const newFile: RecentFile = {
      ...file,
      id: `recent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUsed: new Date(),
      isFavorite: false,
      thumbnail: generateThumbnail(file.svgContent)
    };

    setRecentFiles(prev => {
      // Remove existing file with same content
      const filtered = prev.filter(f => f.svgContent !== file.svgContent);
      // Add new file at the beginning
      const updated = [newFile, ...filtered].slice(0, maxFiles);
      saveRecentFiles(updated);
      return updated;
    });

    return newFile;
  };

  // Generate thumbnail from SVG content
  const generateThumbnail = (svgContent: string): string => {
    try {
      // Create a canvas to render the SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = 120;
      canvas.height = 120;
      
      // Create SVG blob
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return '';
    }
  };

  // Toggle favorite status
  const toggleFavorite = (fileId: string) => {
    setRecentFiles(prev => {
      const updated = prev.map(file => 
        file.id === fileId ? { ...file, isFavorite: !file.isFavorite } : file
      );
      saveRecentFiles(updated);
      return updated;
    });
  };

  // Delete file from history
  const deleteFile = (fileId: string) => {
    setRecentFiles(prev => {
      const updated = prev.filter(file => file.id !== fileId);
      saveRecentFiles(updated);
      return updated;
    });
    onFileDelete?.(fileId);
  };

  // Clear all recent files
  const clearAllFiles = () => {
    setRecentFiles([]);
    localStorage.removeItem('svg-morph-recent-files');
  };

  // Filter and sort files
  const filteredAndSortedFiles = recentFiles
    .filter(file => {
      // Apply search filter
      const matchesSearch = searchTerm === '' || 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (file.projectName && file.projectName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Apply category filter
      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'favorites' && file.isFavorite) ||
        (filterBy === 'recent' && (Date.now() - file.lastUsed.getTime()) < 24 * 60 * 60 * 1000);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'lastUsed':
        default:
          return b.lastUsed.getTime() - a.lastUsed.getTime();
      }
    });

  // Handle file selection
  const handleFileSelect = (file: RecentFile) => {
    // Update last used time
    const updatedFile = { ...file, lastUsed: new Date() };
    setRecentFiles(prev => {
      const updated = prev.map(f => f.id === file.id ? updatedFile : f);
      saveRecentFiles(updated);
      return updated;
    });
    
    onFileSelect(updatedFile);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Recent Files</h3>
          <span className="text-sm text-gray-500">({recentFiles.length})</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
          
          {recentFiles.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Clear all recent files"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="all">All Files</option>
              <option value="favorites">Favorites</option>
              <option value="recent">Last 24h</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="lastUsed">Last Used</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="p-4">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {recentFiles.length === 0 
                ? 'No recent files yet. Upload some SVG files to see them here.'
                : 'No files match your search criteria.'
              }
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
              : 'space-y-2'
          }>
            {filteredAndSortedFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                viewMode={viewMode}
                onSelect={() => handleFileSelect(file)}
                onToggleFavorite={() => toggleFavorite(file.id)}
                onDelete={() => deleteFile(file.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Individual file card component
const FileCard: React.FC<{
  file: RecentFile;
  viewMode: 'grid' | 'list';
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}> = ({ file, viewMode, onSelect, onToggleFavorite, onDelete }) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'extreme': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
        {/* Thumbnail */}
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
          {file.thumbnail ? (
            <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Eye className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0" onClick={onSelect}>
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
            {file.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{formatFileSize(file.size)}</span>
            <span>{formatDate(file.lastUsed)}</span>
            {file.metadata && (
              <span className={`px-2 py-1 rounded-full text-xs ${getComplexityColor(file.metadata.complexity)}`}>
                {file.metadata.complexity}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {file.isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 hover:shadow-md transition-all cursor-pointer">
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 relative" onClick={onSelect}>
        {file.thumbnail ? (
          <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Eye className="w-8 h-8" />
          </div>
        )}
        
        {/* Favorite indicator */}
        {file.isFavorite && (
          <div className="absolute top-2 right-2">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="p-3">
        <h4 className="font-medium text-gray-900 truncate mb-1" title={file.name}>
          {file.name}
        </h4>
        
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>{formatFileSize(file.size)}</span>
            <span>{formatDate(file.lastUsed)}</span>
          </div>
          
          {file.metadata && (
            <div className="flex justify-between items-center">
              <span>{file.metadata.pathCount} paths</span>
              <span className={`px-2 py-1 rounded-full ${getComplexityColor(file.metadata.complexity)}`}>
                {file.metadata.complexity}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {file.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {tag}
              </span>
            ))}
            {file.tags.length > 2 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                +{file.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {file.isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for managing recent files
export const useRecentFiles = () => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('svg-morph-recent-files');
      if (saved) {
        const parsed = JSON.parse(saved);
        const files = parsed.map((file: any) => ({
          ...file,
          lastUsed: new Date(file.lastUsed)
        }));
        setRecentFiles(files);
      }
    } catch (error) {
      console.error('Failed to load recent files:', error);
    }
  }, []);

  const addRecentFile = (file: Omit<RecentFile, 'id' | 'lastUsed' | 'isFavorite'>) => {
    const newFile: RecentFile = {
      ...file,
      id: `recent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUsed: new Date(),
      isFavorite: false
    };

    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.svgContent !== file.svgContent);
      const updated = [newFile, ...filtered].slice(0, 50);
      localStorage.setItem('svg-morph-recent-files', JSON.stringify(updated));
      return updated;
    });

    return newFile;
  };

  return { recentFiles, addRecentFile };
};
