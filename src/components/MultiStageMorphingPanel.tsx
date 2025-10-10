import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Plus, Trash2, Edit3, Save, Upload, Download, Settings } from 'lucide-react';
import { multiStageMorphing, MultiStageSequence, MorphingStage, StageTransition } from '../utils/multiStageMorphing';
import { SVGData } from '../types/svg';
import { useToast } from '../contexts/ToastContext';

interface MultiStageMorphingPanelProps {
  onSequenceChange?: (sequence: MultiStageSequence | null) => void;
  onPreviewUpdate?: (svgData: SVGData) => void;
}

export const MultiStageMorphingPanel: React.FC<MultiStageMorphingPanelProps> = ({
  onSequenceChange,
  onPreviewUpdate
}) => {
  const [sequences, setSequences] = useState<MultiStageSequence[]>([]);
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [editingSequence, setEditingSequence] = useState<string | null>(null);
  const [newSequenceName, setNewSequenceName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, showWarning } = useToast();

  // Load sequences on component mount
  useEffect(() => {
    setSequences(multiStageMorphing.getSequences());
  }, []);

  // Handle sequence playback
  const handlePlay = useCallback(async () => {
    if (!activeSequenceId) {
      showWarning('Please select a sequence to play');
      return;
    }

    try {
      setIsPlaying(true);
      await multiStageMorphing.play(
        activeSequenceId,
        (transition: StageTransition) => {
          setCurrentProgress(transition.progress);
          if (onPreviewUpdate) {
            onPreviewUpdate(transition.interpolatedSVG);
          }
        },
        (stageIndex: number) => {
          setCurrentStage(stageIndex);
        }
      );
      setIsPlaying(false);
      showSuccess('Sequence playback completed');
    } catch (error) {
      setIsPlaying(false);
      showError(`Playback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [activeSequenceId, onPreviewUpdate, showSuccess, showError, showWarning]);

  const handlePause = useCallback(() => {
    multiStageMorphing.pause();
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    multiStageMorphing.stop();
    setIsPlaying(false);
    setCurrentProgress(0);
    setCurrentStage(0);
  }, []);

  const handleReverse = useCallback(async () => {
    if (!activeSequenceId) return;

    try {
      setIsPlaying(true);
      await multiStageMorphing.reverse(
        activeSequenceId,
        (transition: StageTransition) => {
          setCurrentProgress(1 - transition.progress);
          if (onPreviewUpdate) {
            onPreviewUpdate(transition.interpolatedSVG);
          }
        },
        (stageIndex: number) => {
          setCurrentStage(stageIndex);
        }
      );
      setIsPlaying(false);
      showSuccess('Reverse playback completed');
    } catch (error) {
      setIsPlaying(false);
      showError(`Reverse playback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [activeSequenceId, onPreviewUpdate, showSuccess, showError]);

  const handleSeek = useCallback(async (progress: number) => {
    if (!activeSequenceId) return;
    
    setCurrentProgress(progress);
    await multiStageMorphing.seekTo(progress);
  }, [activeSequenceId]);

  const handleSequenceSelect = useCallback((sequenceId: string) => {
    setActiveSequenceId(sequenceId);
    const sequence = multiStageMorphing.getSequence(sequenceId);
    if (onSequenceChange) {
      onSequenceChange(sequence || null);
    }
    handleStop();
  }, [onSequenceChange, handleStop]);

  const handleCreateSequence = useCallback(() => {
    if (!newSequenceName.trim()) {
      showWarning('Please enter a sequence name');
      return;
    }

    // For demo purposes, create a sequence with placeholder SVG data
    const placeholderSVGs: SVGData[] = [
      {
        width: 100,
        height: 100,
        viewBox: '0 0 100 100',
        paths: [{
          d: 'M25,25 L75,25 L75,75 L25,75 Z',
          fill: '#5cbe2c',
          stroke: '#262a23',
          strokeWidth: '2'
        }]
      },
      {
        width: 100,
        height: 100,
        viewBox: '0 0 100 100',
        paths: [{
          d: 'M50,25 A25,25 0 1,1 49.9,25 Z',
          fill: '#d6b77c',
          stroke: '#262a23',
          strokeWidth: '2'
        }]
      }
    ];

    try {
      const sequenceId = multiStageMorphing.createSequence(
        newSequenceName,
        placeholderSVGs,
        [1500, 1500], // durations
        ['ease-in-out', 'bounce'], // easings
        [0, 200] // delays
      );

      setSequences(multiStageMorphing.getSequences());
      setActiveSequenceId(sequenceId);
      setNewSequenceName('');
      showSuccess(`Sequence "${newSequenceName}" created successfully`);
    } catch (error) {
      showError(`Failed to create sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [newSequenceName, showSuccess, showError, showWarning]);

  const handleDeleteSequence = useCallback((sequenceId: string) => {
    const sequence = multiStageMorphing.getSequence(sequenceId);
    if (!sequence) return;

    if (window.confirm(`Are you sure you want to delete "${sequence.name}"?`)) {
      multiStageMorphing.deleteSequence(sequenceId);
      setSequences(multiStageMorphing.getSequences());
      
      if (activeSequenceId === sequenceId) {
        setActiveSequenceId(null);
        if (onSequenceChange) {
          onSequenceChange(null);
        }
      }
      
      showSuccess(`Sequence "${sequence.name}" deleted`);
    }
  }, [activeSequenceId, onSequenceChange, showSuccess]);

  const handleExportSequence = useCallback((sequenceId: string) => {
    const sequence = multiStageMorphing.exportSequence(sequenceId);
    if (!sequence) return;

    const dataStr = JSON.stringify(sequence, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sequence.name.replace(/\s+/g, '_')}_sequence.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showSuccess(`Sequence "${sequence.name}" exported`);
  }, [showSuccess]);

  const handleImportSequence = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const sequenceData = JSON.parse(e.target?.result as string);
        const newId = multiStageMorphing.importSequence(sequenceData);
        setSequences(multiStageMorphing.getSequences());
        setActiveSequenceId(newId);
        showSuccess(`Sequence "${sequenceData.name}" imported successfully`);
      } catch (error) {
        showError(`Failed to import sequence: ${error instanceof Error ? error.message : 'Invalid file format'}`);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [showSuccess, showError]);

  const activeSequence = activeSequenceId ? multiStageMorphing.getSequence(activeSequenceId) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-secondary rounded-xl flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Multi-Stage Morphing</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create complex morphing sequences</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Create New Sequence */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Create New Sequence</h3>
        <div className="flex space-x-3">
          <input
            type="text"
            value={newSequenceName}
            onChange={(e) => setNewSequenceName(e.target.value)}
            placeholder="Enter sequence name..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateSequence()}
          />
          <button
            onClick={handleCreateSequence}
            className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Sequence List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sequences</h3>
          <div className="flex space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportSequence}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Import Sequence"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {sequences.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sequences created yet</p>
            <p className="text-sm">Create your first multi-stage morphing sequence above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sequences.map((sequence) => (
              <div
                key={sequence.id}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  activeSequenceId === sequence.id
                    ? 'border-accent bg-accent/5 dark:bg-accent/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-accent/50'
                }`}
                onClick={() => handleSequenceSelect(sequence.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{sequence.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>{sequence.stages.length} stages</span>
                      <span>{(sequence.totalDuration / 1000).toFixed(1)}s duration</span>
                      {sequence.loop && <span className="text-accent">Loop</span>}
                      {sequence.autoReverse && <span className="text-secondary">Auto-reverse</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSequence(sequence.id);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Export Sequence"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSequence(sequence.id);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit Sequence"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSequence(sequence.id);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete Sequence"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {activeSequence && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Playback Controls</h3>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className="w-12 h-12 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center justify-center"
            >
              <Play className="w-5 h-5" />
            </button>
            <button
              onClick={handlePause}
              disabled={!isPlaying}
              className="w-12 h-12 bg-secondary text-white rounded-xl hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center justify-center"
            >
              <Pause className="w-5 h-5" />
            </button>
            <button
              onClick={handleStop}
              className="w-12 h-12 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all hover:scale-105 flex items-center justify-center"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={handleReverse}
              disabled={isPlaying}
              className="w-12 h-12 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center justify-center"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Progress: {Math.round(currentProgress * 100)}%</span>
              <span>Stage: {currentStage + 1} / {activeSequence.stages.length}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={currentProgress}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #5cbe2c 0%, #5cbe2c ${currentProgress * 100}%, #e5e7eb ${currentProgress * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
          </div>

          {/* Stage Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSequence.stages.map((stage, index) => (
              <div
                key={stage.id}
                className={`p-3 rounded-lg border ${
                  index === currentStage
                    ? 'border-accent bg-accent/10'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{stage.name}</span>
                  {index === currentStage && (
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <div>Duration: {stage.duration}ms</div>
                  <div>Easing: {stage.easing}</div>
                  {stage.delay > 0 && <div>Delay: {stage.delay}ms</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && activeSequence && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sequence Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={activeSequence.loop}
                onChange={(e) => {
                  multiStageMorphing.updateSequence(activeSequence.id, { loop: e.target.checked });
                  setSequences(multiStageMorphing.getSequences());
                }}
                className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <span className="text-gray-900 dark:text-white">Loop sequence</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={activeSequence.autoReverse}
                onChange={(e) => {
                  multiStageMorphing.updateSequence(activeSequence.id, { autoReverse: e.target.checked });
                  setSequences(multiStageMorphing.getSequences());
                }}
                className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <span className="text-gray-900 dark:text-white">Auto-reverse</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
