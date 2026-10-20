import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Plus, Trash2, Save, Upload, Download, Settings, X, FileImage, ArrowUpDown } from 'lucide-react';
import { multiStageMorphing, MultiStageSequence, MorphingStage, StageTransition } from '../utils/multiStageMorphing';
import { SVGData } from '../types/svg';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';
import { Field, Select, Slider } from './ui/Fields';

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
    if (!activeSequenceId) return;
    multiStageMorphing.reverse(activeSequenceId);
  }, [activeSequenceId]);

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
    setStageUploads(prev => [newStage, ...prev]);
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

  const handleUpdateStageProperty = useCallback((stageId: string, property: keyof StageUpload, value: string | number) => {
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

  const handleReverseSequence = useCallback((sequenceId: string) => {
    const success = multiStageMorphing.reverseSequenceOrder(sequenceId);
    if (success) {
      setSequences(multiStageMorphing.getSequences());
      
      // Update the active sequence if it's the one being reversed
      if (activeSequenceId === sequenceId) {
        const updatedSequence = multiStageMorphing.getSequence(sequenceId);
        if (onSequenceChange && updatedSequence) {
          onSequenceChange(updatedSequence);
        }
      }
      
      showSuccess('Sequence order reversed');
    } else {
      showError('Failed to reverse sequence');
    }
  }, [activeSequenceId, onSequenceChange, showSuccess, showError]);

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
    <Panel
      title="Sequence Builder"
      className="space-y-6"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowStageBuilder(true)}>
            <Plus className="w-4 h-4" />
            <span>New Sequence</span>
          </Button>
          <Button
            size="icon"
            variant={showSettings ? 'primary' : 'ghost'}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted -mt-2">Create complex animation sequences</p>

      {/* Stage Builder Modal */}
      {showStageBuilder && (
        <div className="fixed inset-0 !mt-0 bg-canvas/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-surface max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
              <h3 className="text-xl font-medium">Create Multi-Stage Sequence</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowStageBuilder(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-5 pb-5 sm:px-6 sm:pb-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Sequence Name */}
                <Field label="Sequence Name">
                  <input
                    type="text"
                    value={buildingSequenceName}
                    onChange={(e) => setBuildingSequenceName(e.target.value)}
                    className="h-11 w-full bg-raised px-3 text-content"
                    placeholder="My Animation Sequence"
                  />
                </Field>

                {/* Stages */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-lg font-medium">Animation Stages</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => setStageUploads(prev => [...prev].reverse())}
                        disabled={stageUploads.length < 2}
                        title="Reverse Stage Order"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        <span>Reverse</span>
                      </Button>
                      <Button variant="primary" onClick={handleAddStage}>
                        <Plus className="w-4 h-4" />
                        <span>Add Stage</span>
                      </Button>
                    </div>
                  </div>

                  {stageUploads.length === 0 && (
                    <div className="text-center py-8 text-muted">
                      <FileImage className="w-12 h-12 mx-auto mb-3" />
                      <p>No stages added yet</p>
                      <p className="text-sm">Click "Add Stage" to get started</p>
                    </div>
                  )}

                  {stageUploads.map((stage, index) => (
                    <div key={stage.id} className="bg-canvas p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="font-medium">
                          Stage {index + 1}: {stage.name}
                        </h5>
                        <button
                          onClick={() => handleRemoveStage(stage.id)}
                          className="inline-flex h-11 w-11 items-center justify-center text-danger hover:bg-raised transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SVG Upload */}
                        <div>
                          <span className="mb-2 block text-sm font-medium">SVG File</span>
                          <input
                            ref={el => fileInputRefs.current[stage.id] = el}
                            type="file"
                            accept=".svg"
                            onChange={(e) => handleStageFileUpload(stage.id, e)}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRefs.current[stage.id]?.click()}
                            className={`w-full min-h-11 p-3 transition-colors ${
                              stage.svgData
                                ? 'bg-selected text-content'
                                : 'bg-raised hover:bg-line/30 text-muted'
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
                        <Field label="Stage Name">
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => handleUpdateStageProperty(stage.id, 'name', e.target.value)}
                            className="h-11 w-full bg-raised px-3 text-content"
                          />
                        </Field>

                        {/* Duration */}
                        <Field label="Duration (ms)">
                          <input
                            type="number"
                            min="100"
                            max="10000"
                            value={stage.duration}
                            onChange={(e) => handleUpdateStageProperty(stage.id, 'duration', parseInt(e.target.value))}
                            className="h-11 w-full bg-raised px-3 text-content"
                          />
                        </Field>

                        {/* Easing */}
                        <Field label="Easing">
                          <Select
                            value={stage.easing}
                            onChange={(e) => handleUpdateStageProperty(stage.id, 'easing', e.target.value)}
                          >
                            <option value="linear">Linear</option>
                            <option value="ease">Ease</option>
                            <option value="ease-in">Ease In</option>
                            <option value="ease-out">Ease Out</option>
                            <option value="ease-in-out">Ease In Out</option>
                            <option value="bounce">Bounce</option>
                            <option value="elastic">Elastic</option>
                          </Select>
                        </Field>
                      </div>

                      {/* SVG Preview */}
                      {stage.svgData && (
                        <div className="bg-raised p-3">
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
                <div className="flex flex-wrap justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setShowStageBuilder(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateSequenceFromStages}
                    disabled={!buildingSequenceName.trim() || stageUploads.length < 2 || stageUploads.some(s => !s.svgData)}
                  >
                    <Save className="w-4 h-4" />
                    <span>Create Sequence</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing sequences and controls... */}
      {sequences.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Sequences</h3>
          <div className="grid gap-3">
            {sequences.map((sequence) => (
              <div
                key={sequence.id}
                className={`p-4 transition-colors cursor-pointer ${
                  activeSequenceId === sequence.id
                    ? 'bg-selected'
                    : 'bg-raised hover:bg-line/30'
                }`}
                onClick={() => handleSequenceSelect(sequence.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-medium">{sequence.name}</h4>
                    <p className="text-sm text-muted">
                      {sequence.stages.length} stages • {(sequence.totalDuration / 1000).toFixed(1)}s
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReverseSequence(sequence.id);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center text-content hover:bg-line/40 transition-colors"
                      title="Reverse Stage Order"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSequence(sequence.id);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center text-content hover:bg-line/40 transition-colors"
                      title="Export Sequence"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSequence(sequence.id);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center text-content hover:bg-line/40 transition-colors"
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
        <div className="bg-canvas p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium">Playback Controls</h4>
            <div className="text-sm text-muted">
              Stage {currentStage + 1} of {activeSequence.stages.length}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="icon" variant="primary" onClick={isPlaying ? handlePause : handlePlay}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button size="icon" onClick={handleStop}>
              <Square className="w-5 h-5" />
            </Button>
            <Button size="icon" onClick={handleReverse}>
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Progress</span>
              <span>{Math.round(currentProgress * 100)}%</span>
            </div>
            <Slider
              min="0"
              max="1"
              step="0.01"
              value={currentProgress}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {sequences.length === 0 && (
        <div className="text-center py-8 text-muted">
          <Play className="w-12 h-12 mx-auto mb-3" />
          <p>No sequences created yet</p>
          <p className="text-sm">Click "New Sequence" to get started</p>
        </div>
      )}
    </Panel>
  );
};
