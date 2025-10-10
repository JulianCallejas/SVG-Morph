import React, { useEffect, useState, useCallback } from 'react';
import { Keyboard, Play, Upload, Download, RotateCcw, Settings, Eye, X } from 'lucide-react';

interface ShortcutAction {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutAction[];
  onShortcut?: (shortcutId: string) => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ 
  shortcuts, 
  onShortcut 
}) => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  const normalizeKey = (key: string): string => {
    const keyMap: { [key: string]: string } = {
      'Control': 'ctrl',
      'Meta': 'cmd',
      'Alt': 'alt',
      'Shift': 'shift',
      ' ': 'space',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'Escape': 'esc',
      'Enter': 'enter',
      'Backspace': 'backspace',
      'Delete': 'delete',
      'Tab': 'tab'
    };
    
    return keyMap[key] || key.toLowerCase();
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = normalizeKey(event.key);
    
    setPressedKeys(prev => new Set([...prev, key]));

    // Check for matching shortcuts
    const matchingShortcut = shortcuts.find(shortcut => {
      if (shortcut.disabled) return false;
      
      const requiredKeys = shortcut.keys.map(k => k.toLowerCase());
      const currentKeys = Array.from(pressedKeys).concat([key]);
      
      return requiredKeys.length === currentKeys.length &&
             requiredKeys.every(reqKey => currentKeys.includes(reqKey));
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
      onShortcut?.(matchingShortcut.id);
      setPressedKeys(new Set()); // Clear pressed keys after action
    }
  }, [shortcuts, pressedKeys, onShortcut]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = normalizeKey(event.key);
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Show help with ? key
  useEffect(() => {
    const handleHelpToggle = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setShowHelp(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleHelpToggle);
    return () => window.removeEventListener('keydown', handleHelpToggle);
  }, []);

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    if (!groups[shortcut.category]) {
      groups[shortcut.category] = [];
    }
    groups[shortcut.category].push(shortcut);
    return groups;
  }, {} as { [category: string]: ShortcutAction[] });

  const formatKeys = (keys: string[]) => {
    return keys.map(key => {
      const keyMap: { [key: string]: string } = {
        'ctrl': '⌃',
        'cmd': '⌘',
        'alt': '⌥',
        'shift': '⇧',
        'space': '␣',
        'enter': '↵',
        'esc': '⎋',
        'backspace': '⌫',
        'delete': '⌦',
        'tab': '⇥',
        'up': '↑',
        'down': '↓',
        'left': '←',
        'right': '→'
      };
      return keyMap[key.toLowerCase()] || key.toUpperCase();
    }).join(' + ');
  };

  return (
    <>
      {/* Keyboard Shortcuts Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Keyboard className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                      {category}
                    </h3>
                    <div className="space-y-3">
                      {categoryShortcuts.map((shortcut) => (
                        <div
                          key={shortcut.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            shortcut.disabled 
                              ? 'bg-gray-50 opacity-50' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          } transition-colors`}
                        >
                          <div className="flex items-center space-x-3">
                            {shortcut.icon && (
                              <div className="text-gray-500">
                                {shortcut.icon}
                              </div>
                            )}
                            <span className={`text-sm ${
                              shortcut.disabled ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {shortcut.description}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {shortcut.keys.map((key, index) => (
                              <React.Fragment key={key}>
                                {index > 0 && <span className="text-gray-400 text-xs">+</span>}
                                <kbd className={`px-2 py-1 text-xs font-mono rounded border ${
                                  shortcut.disabled
                                    ? 'bg-gray-200 text-gray-400 border-gray-300'
                                    : 'bg-white text-gray-700 border-gray-300 shadow-sm'
                                }`}>
                                  {formatKeys([key])}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">?</kbd> to toggle this help</span>
                <span>Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">ESC</kbd> to close</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Shortcut Indicator */}
      {pressedKeys.size > 0 && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg backdrop-blur-sm z-40">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4" />
            <span className="text-sm font-mono">
              {Array.from(pressedKeys).map(key => formatKeys([key])).join(' + ')}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>([]);

  const addShortcut = useCallback((shortcut: ShortcutAction) => {
    setShortcuts(prev => [...prev.filter(s => s.id !== shortcut.id), shortcut]);
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateShortcut = useCallback((id: string, updates: Partial<ShortcutAction>) => {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const enableShortcut = useCallback((id: string) => {
    updateShortcut(id, { disabled: false });
  }, [updateShortcut]);

  const disableShortcut = useCallback((id: string) => {
    updateShortcut(id, { disabled: true });
  }, [updateShortcut]);

  return {
    shortcuts,
    addShortcut,
    removeShortcut,
    updateShortcut,
    enableShortcut,
    disableShortcut
  };
};

// Default shortcuts for SVG Morph
export const createDefaultShortcuts = (actions: {
  uploadSource?: () => void;
  uploadTarget?: () => void;
  playAnimation?: () => void;
  pauseAnimation?: () => void;
  resetAnimation?: () => void;
  exportAnimation?: () => void;
  openSettings?: () => void;
  toggleFullscreen?: () => void;
  undo?: () => void;
  redo?: () => void;
  save?: () => void;
  togglePreview?: () => void;
}): ShortcutAction[] => {
  return [
    // File Operations
    {
      id: 'upload-source',
      keys: ['ctrl', 'o'],
      description: 'Upload source SVG',
      category: 'File Operations',
      action: actions.uploadSource || (() => {}),
      icon: <Upload className="w-4 h-4" />,
      disabled: !actions.uploadSource
    },
    {
      id: 'upload-target',
      keys: ['ctrl', 'shift', 'o'],
      description: 'Upload target SVG',
      category: 'File Operations',
      action: actions.uploadTarget || (() => {}),
      icon: <Upload className="w-4 h-4" />,
      disabled: !actions.uploadTarget
    },
    {
      id: 'save',
      keys: ['ctrl', 's'],
      description: 'Save project',
      category: 'File Operations',
      action: actions.save || (() => {}),
      disabled: !actions.save
    },
    {
      id: 'export',
      keys: ['ctrl', 'e'],
      description: 'Export animation',
      category: 'File Operations',
      action: actions.exportAnimation || (() => {}),
      icon: <Download className="w-4 h-4" />,
      disabled: !actions.exportAnimation
    },

    // Animation Controls
    {
      id: 'play-pause',
      keys: ['space'],
      description: 'Play/Pause animation',
      category: 'Animation',
      action: actions.playAnimation || (() => {}),
      icon: <Play className="w-4 h-4" />,
      disabled: !actions.playAnimation
    },
    {
      id: 'reset',
      keys: ['r'],
      description: 'Reset animation',
      category: 'Animation',
      action: actions.resetAnimation || (() => {}),
      icon: <RotateCcw className="w-4 h-4" />,
      disabled: !actions.resetAnimation
    },

    // View Controls
    {
      id: 'toggle-preview',
      keys: ['p'],
      description: 'Toggle preview mode',
      category: 'View',
      action: actions.togglePreview || (() => {}),
      disabled: !actions.togglePreview
    },
    {
      id: 'fullscreen',
      keys: ['f'],
      description: 'Toggle fullscreen',
      category: 'View',
      action: actions.toggleFullscreen || (() => {}),
      disabled: !actions.toggleFullscreen
    },

    // Edit Operations
    {
      id: 'undo',
      keys: ['ctrl', 'z'],
      description: 'Undo last action',
      category: 'Edit',
      action: actions.undo || (() => {}),
      disabled: !actions.undo
    },
    {
      id: 'redo',
      keys: ['ctrl', 'y'],
      description: 'Redo last action',
      category: 'Edit',
      action: actions.redo || (() => {}),
      disabled: !actions.redo
    },

    // Settings
    {
      id: 'settings',
      keys: ['ctrl', ','],
      description: 'Open settings',
      category: 'Settings',
      action: actions.openSettings || (() => {}),
      icon: <Settings className="w-4 h-4" />,
      disabled: !actions.openSettings
    },

    // Help
    {
      id: 'help',
      keys: ['?'],
      description: 'Show keyboard shortcuts',
      category: 'Help',
      action: () => {}, // Handled by the component itself
      icon: <HelpCircle className="w-4 h-4" />
    }
  ];
};
