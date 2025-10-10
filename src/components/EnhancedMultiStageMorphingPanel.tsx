import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Plus, Trash2, Edit3, Save, Upload, Download, Settings, X, FileImage } from 'lucide-react';
import { multiStageMorphing, MultiStageSequence, MorphingStage, StageTransition } from '../utils/multiStageMorphing';
import { SVGData } from '../types/svg';
import { useToast } from '../contexts/ToastContext';

interface EnhancedMultiStageMorphingPanelProps {
  onSequenceChange?: (sequence: MultiStageSequence | null) => void;
  onPreviewUpdate?: (svgData: SVGData) => void;
}

interface StageUpload {
  id: string;
  name: string;
  svgData: SVGData | null;
  duration: number;
  easing: string;
  delay: number;
}

export const EnhancedMultiStageMorphingPanel: React.FC<EnhancedMultiStageMorphingPanelProps> = ({
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
  const [showStageBuilder, setShowStageBuilder] = useState(false);
  
  // Stage builder state
  const [stageUploads, setStageUploads] = useState<StageUpload[]>([]);
  const [buildingSequenceName, setBuildingSequenceName] = useState('');
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
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
    } catch (error) {
      showError(`Playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPlaying(false);
    }
  }, [activeSequenceId, onPreviewUpdate, showError, showWarning]);

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

  const handleReverse = useCallback(() => {
    multiStageMorphing.reverse();
  }, []);

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

  // Stage Builder Functions
  const handleAddStage = useCallback(() => {
    const newStage: StageUpload = {
      id: `stage_${Date.now()}`,
      name: `Stage ${stageUploads.length + 1}`,
      svgData: null,
      duration: 2000,
      easing: 'ease-in-out',
      delay: 0
    };
    setStageUploads(prev => [...prev, newStage]);
  }, [stageUploads.length]);

  const handleRemoveStage = useCallback((stageId: string) => {
    setStageUploads(prev => prev.filter(stage => stage.id !== stageId));
  }, []);

  const handleStageFileUpload = useCallback(async (stageId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.svg')) {
      showWarning('Please select an SVG file');
      return;
    }

    try {
      const svgContent = await file.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');

      if (!svgElement) {
        showError('Invalid SVG file');
        return;
      }

      // Extract SVG data
      const width = parseInt(svgElement.getAttribute('width') || '100');
      const height = parseInt(svgElement.getAttribute('height') || '100');
      const viewBox = svgElement.getAttribute('viewBox') || `0 0 ${width} ${height}`;
      
      const paths = Array.from(svgElement.querySelectorAll('path')).map(path => ({
        d: path.getAttribute('d') || '',
        fill: path.getAttribute('fill') || 'none',
        stroke: path.getAttribute('stroke') || 'none',
        strokeWidth: path.getAttribute('stroke-width') || '1'
      }));

      const svgData: SVGData = {
        width,
        height,
        viewBox,
        paths
      };

      setStageUploads(prev => prev.map(stage => 
        stage.id === stageId ? { ...stage, svgData, name: file.name.replace('.svg', '') } : stage
      ));

      showSuccess(`SVG uploaded for ${file.name}`);
    } catch (error) {
      showError(`Failed to process SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    if (fileInputRefs.current[stageId]) {
      fileInputRefs.current[stageId]!.value = '';
    }
  }, [showSuccess, showError, showWarning]);

  const handleUpdateStageProperty = useCallback((stageId: string, property: keyof StageUpload, value: any) => {
    setStageUploads(prev => prev.map(stage => 
      stage.id === stageId ? { ...stage, [property]: value } : stage
    ));
  }, []);

  const handleCreateSequenceFromStages = useCallback(() => {
    if (!buildingSequenceName.trim()) {
      showWarning('Please enter a sequence name');
      return;
    }

    if (stageUploads.length < 2) {
      showWarning('Please add at least 2 stages');
      return;
    }

    const invalidStages = stageUploads.filter(stage => !stage.svgData);
    if (invalidStages.length > 0) {
      showWarning('Please upload SVG files for all stages');
      return;
    }

    try {
      const stages: MorphingStage[] = stageUploads.map(stage => ({
        id: stage.id,
        svgData: stage.svgData!,
        duration: stage.duration,
        easing: stage.easing,
        delay: stage.delay,
        name: stage.name
      }));

      const sequenceId = multiStageMorphing.createSequence(buildingSequenceName, stages);
      setSequences(multiStageMorphing.getSequences());
      setActiveSequenceId(sequenceId);
      
      // Reset stage builder
      setStageUploads([]);
      setBuildingSequenceName('');
      setShowStageBuilder(false);
      
      showSuccess(`Sequence "${buildingSequenceName}" created successfully!`);
    } catch (error) {
      showError(`Failed to create sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [buildingSequenceName, stageUploads, showSuccess, showError, showWarning]);

  const handleDeleteSequence = useCallback((sequenceId: string) => {
    multiStageMorphing.deleteSequence(sequenceId);
    setSequences(multiStageMorphing.getSequences());
    if (activeSequenceId === sequenceId) {
      setActiveSequenceId(null);
      if (onSequenceChange) {
        onSequenceChange(null);
      }
    }
    showSuccess('Sequence deleted');
  }, [activeSequenceId, onSequenceChange, showSuccess]);

  const handleExportSequence = useCallback((sequenceId: string) => {
    const sequence = multiStageMorphing.getSequence(sequenceId);
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

  const activeSequence = activeSequenceId ? multiStageMorphing.getSequence(activeSequenceId) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Multi-Stage Morphing</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create complex animation sequences</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStageBuilder(true)}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>New Sequence</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stage Builder Modal */}
      {showStageBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Multi-Stage Sequence</h3>
              <button
                onClick={() => setShowStageBuilder(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Sequence Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sequence Name
                  </label>
                  <input
                    type="text"
                    value={buildingSequenceName}
                    onChange={(e) => setBuildingSequenceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="My Animation Sequence"
                  />
                </div>

                {/* Stages */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Animation Stages</h4>
                    <button
                      onClick={handleAddStage}
                      className="inline-flex items-center space-x-2 bg-accent hover:bg-accent/90 text-white px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Stage</span>
                    </button>
                  </div>

                  {stageUploads.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileImage className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No stages added yet</p>
                      <p className="text-sm">Click "Add Stage" to get started</p>
                    </div>
                  )}

                  {stageUploads.map((stage, index) => (
                    <div key={stage.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Stage {index + 1}: {stage.name}
                        </h5>
                        <button
                          onClick={() => handleRemoveStage(stage.id)}
                          className="p-1 text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SVG Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            SVG File
                          </label>
                          <input
                            ref={el => fileInputRefs.current[stage.id] = el}
                            type="file"
                            accept=".svg"
                            onChange={(e) => handleStageFileUpload(stage.id, e)}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRefs.current[stage.id]?.click()}
                            className={`w-full p-3 border-2 border-dashed rounded-xl transition-colors ${
                              stage.svgData
                                ? 'border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                : 'border-gray-300 dark:border-gray-600 hover:border-accent text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-center space-x-2">
                              <Upload className="w-5 h-5" />
                              <span>
                                {stage.svgData ? `✓ ${stage.name}.svg` : 'Upload SVG'}
                              </span>
                            </div>
                          </button>
                        </div>

                        {/* Stage Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Stage Name
                          </label>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => handleUpdateStageProperty(stage.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                          />
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Duration (ms)
                          </label>
                          <input
                            type="number"
                            min="100"
                            max="10000"
                            value={stage.duration}
                            onChange={(e) => handleUpdateStageProperty(stage.id, 'duration', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                          />
                        </div>

                        {/* Easing */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Easing
                          </label>
                          <select
                            value={stage.easing}
                            onChange={(e) => handleUpdateStageProperty(stage.id, 'easing', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                          >
                            <option value="linear">Linear</option>
                            <option value="ease">Ease</option>
                            <option value="ease-in">Ease In</option>
                            <option value="ease-out">Ease Out</option>
                            <option value="ease-in-out">Ease In Out</option>
                            <option value="bounce">Bounce</option>
                            <option value="elastic">Elastic</option>
                          </select>
                        </div>
                      </div>

                      {/* SVG Preview */}
                      {stage.svgData && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-center h-20">
                            <div 
                              dangerouslySetInnerHTML={{
                                __html: `<svg width="60" height="60" viewBox="${stage.svgData.viewBox}" class="max-w-full max-h-full">
                                  ${stage.svgData.paths.map(path => 
                                    `<path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" />`
                                  ).join('')}
                                </svg>`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Create Button */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowStageBuilder(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSequenceFromStages}
                    disabled={!buildingSequenceName.trim() || stageUploads.length < 2 || stageUploads.some(s => !s.svgData)}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <Save className="w-4 h-4" />
                    <span>Create Sequence</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing sequences and controls... */}
      {sequences.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sequences</h3>
          <div className="grid gap-3">
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
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{sequence.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {sequence.stages.length} stages • {(sequence.totalDuration / 1000).toFixed(1)}s
                    </p>
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
        </div>
      )}

      {/* Playback Controls */}
      {activeSequence && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-white">Playback Controls</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Stage {currentStage + 1} of {activeSequence.stages.length}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="p-3 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={handleStop}
              className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={handleReverse}
              className="p-3 bg-secondary hover:bg-secondary/90 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span>{Math.round(currentProgress * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentProgress}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {sequences.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No sequences created yet</p>
          <p className="text-sm">Click "New Sequence" to get started</p>
        </div>
      )}
    </div>
  );
};
